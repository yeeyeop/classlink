import { getAvailability } from './availability.js'
import { validateBooking } from './booking-rules.js'
import { segments } from '../src/data.js'

const STATUS_LABELS = {
  free: '空闲可约',
  class: '课程占用',
  reserved: '已被预约',
  mine: '当前管理员账号已预约',
  maintenance: '维护或未投入',
  closed: '不可预约',
}

const BOOKING_RULES = [
  '日期必须是真实存在的 YYYY-MM-DD，不能预约过去日期。',
  '起始节次为 1-6，时长最多 4 节，不能跨出开放时间。',
  '当天已经开始的节次不能预约。',
  '预约人数必须为正整数且不能超过教室容量。',
  '课程占用时段不能预约。',
  '同一教室的预约时段不能重叠。',
]

export const CLASSROOM_AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_rooms',
      description:
        '查询当前日期和节次下的教室，可按状态、楼层、类型和最小容量筛选。',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['free', 'class', 'reserved', 'maintenance', 'closed'],
          },
          floor: { type: 'integer', minimum: 1, maximum: 5 },
          type: { type: 'string' },
          minCapacity: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_room',
      description: '查询指定教室的状态、课程、预约、容量和设施。',
      parameters: {
        type: 'object',
        properties: {
          room: { type: 'string', description: '教室号或 roomId，例如 205' },
        },
        required: ['room'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_courses',
      description: '列出当前日期和节次下有课程安排的教室。',
      parameters: {
        type: 'object',
        properties: {
          floor: { type: 'integer', minimum: 1, maximum: 5 },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_reservations',
      description: '列出当前日期和节次下有效的学生预约。',
      parameters: {
        type: 'object',
        properties: {
          floor: { type: 'integer', minimum: 1, maximum: 5 },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_device_status',
      description: '查询指定教室已持久化的空调、灯光和投影状态。',
      parameters: {
        type: 'object',
        properties: {
          room: { type: 'string', description: '教室号或 roomId，例如 205' },
        },
        required: ['room'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_booking_rules',
      description: '获取平台当前的教室预约规则。',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_booking',
      description:
        '准备一条预约操作。只生成待确认操作，不直接写入数据库。管理员确认后才能执行。',
      parameters: {
        type: 'object',
        properties: {
          room: { type: 'string', description: '教室号或 roomId，例如 205' },
          date: { type: 'string', description: '日期 YYYY-MM-DD' },
          segment: {
            type: 'integer',
            minimum: 1,
            maximum: 6,
            description:
              '节次块编号：1=第1-2节，2=第3-4节，3=第5-6节，4=第7-8节，5=第9-10节，6=第11-12节',
          },
          duration: { type: 'integer', minimum: 1, maximum: 4 },
          people: { type: 'integer', minimum: 1 },
          purpose: { type: 'string' },
          targetUserId: { type: 'string' },
          studentSid: { type: 'string' },
          studentName: { type: 'string' },
        },
        required: ['room'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_cancel_booking',
      description:
        '准备取消预约操作。只生成待确认操作，不直接修改数据库。管理员确认后才能执行。',
      parameters: {
        type: 'object',
        properties: {
          bookingId: { type: 'string' },
          room: { type: 'string' },
          date: { type: 'string' },
          segment: {
            type: 'integer',
            minimum: 1,
            maximum: 6,
            description:
              '节次块编号：1=第1-2节，2=第3-4节，3=第5-6节，4=第7-8节，5=第9-10节，6=第11-12节',
          },
          studentSid: { type: 'string' },
          studentName: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
]

function compactDevice(device) {
  if (!device) return null
  return {
    acOn: Boolean(device.ac?.on),
    acTemp: device.ac?.temp ?? null,
    acMode: device.ac?.mode ?? null,
    projectorOn: Boolean(device.projector?.on),
    activeLights: Object.entries(device.lights || {})
      .filter(([, enabled]) => enabled)
      .map(([id]) => id),
    updatedAt: device.updatedAt || null,
  }
}

function compactRoom(room) {
  return {
    roomId: room.roomId,
    floor: room.floor,
    room: room.room,
    type: room.type,
    capacity: room.capacity,
    status: room.status,
    statusLabel: room.statusLabel,
    facilities: room.facilities,
    course: room.course,
    booking: room.booking,
    device: room.device,
  }
}

export function executeAdminAssistantTool(name, args, context) {
  const input = args && typeof args === 'object' ? args : {}
  const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 50)
  const roomQuery =
    typeof input.room === 'string' ? input.room.trim().toLowerCase() : ''

  if (name === 'get_booking_rules') {
    return {
      date: context.date,
      segment: context.segment,
      segmentLabel: context.segmentMeta?.label,
      segmentTime: context.segmentMeta?.time,
      rules: BOOKING_RULES,
    }
  }

  if (name === 'get_room') {
    const room = context.rooms.find(
      (item) =>
        item.room.toLowerCase() === roomQuery ||
        item.roomId.toLowerCase() === roomQuery,
    )
    return room
      ? compactRoom(room)
      : { error: `没有找到教室 ${input.room || ''}` }
  }

  if (name === 'get_device_status') {
    const room = context.rooms.find(
      (item) =>
        item.room.toLowerCase() === roomQuery ||
        item.roomId.toLowerCase() === roomQuery,
    )
    return room
      ? {
          roomId: room.roomId,
          floor: room.floor,
          room: room.room,
          device: room.device,
        }
      : { error: `没有找到教室 ${input.room || ''}` }
  }

  if (name === 'list_courses') {
    return context.rooms
      .filter((room) => room.course)
      .filter((room) => !input.floor || room.floor === Number(input.floor))
      .slice(0, limit)
      .map(compactRoom)
  }

  if (name === 'list_reservations') {
    return context.rooms
      .filter((room) => room.booking)
      .filter((room) => !input.floor || room.floor === Number(input.floor))
      .slice(0, limit)
      .map(compactRoom)
  }

  if (name === 'search_rooms') {
    return context.rooms
      .filter((room) => !input.status || room.status === input.status)
      .filter((room) => !input.floor || room.floor === Number(input.floor))
      .filter(
        (room) =>
          !input.type ||
          room.type.toLowerCase().includes(String(input.type).toLowerCase()),
      )
      .filter(
        (room) =>
          !input.minCapacity ||
          Number(room.capacity || 0) >= Number(input.minCapacity),
      )
      .slice(0, limit)
      .map(compactRoom)
  }

  if (name === 'prepare_booking') {
    const room = context.rooms.find(
      (item) =>
        item.room.toLowerCase() === roomQuery ||
        item.roomId.toLowerCase() === roomQuery,
    )
    if (!room) return { error: `没有找到教室 ${input.room || ''}` }
    const target =
      context.users.find((user) => user.id === input.targetUserId) ||
      context.users.find(
        (user) => input.studentSid && user.sid === String(input.studentSid),
      ) ||
      context.users.find(
        (user) =>
          input.studentName && user.name === String(input.studentName).trim(),
      ) ||
      context.actor
    if (!target) return { error: '没有找到预约使用人' }

    const candidate = {
      roomId: room.roomId,
      date: input.date || context.date,
      segment: Number(input.segment ?? context.segment),
      duration: Number(input.duration || 1),
      people: Number(input.people || 1),
      purpose: String(input.purpose || '管理员助手预约').trim(),
    }
    const validation = validateBooking(candidate, context.bookings)
    if (validation.error) {
      return { error: validation.error, status: validation.status }
    }
    return {
      requiresConfirmation: true,
      action: {
        type: 'book',
        summary: `为 ${target.name}（${target.sid}）预约 ${room.floor}F ${room.room}，${candidate.date} ${segments.find((item) => item.id === candidate.segment)?.label || `第 ${candidate.segment} 节`}起，持续 ${candidate.duration} 节`,
        payload: {
          ...candidate,
          targetUserId: target.id,
        },
      },
    }
  }

  if (name === 'prepare_cancel_booking') {
    const booking =
      context.bookings.find((item) => item.id === input.bookingId) ||
      context.bookings.find(
        (item) =>
          (!roomQuery ||
            item.room?.toLowerCase() === roomQuery ||
            item.roomId.toLowerCase() === roomQuery) &&
          (!input.date || item.date === input.date) &&
          (!input.segment || Number(item.segment) === Number(input.segment)) &&
          (!input.studentSid || item.userSid === String(input.studentSid)) &&
          (!input.studentName ||
            item.userName === String(input.studentName).trim()),
      )
    if (!booking) return { error: '没有找到符合条件的预约' }
    return {
      requiresConfirmation: true,
      action: {
        type: 'cancel',
        summary: `取消 ${booking.userName}（${booking.userSid || '无学号'}）在 ${booking.floor}F ${booking.room} ${booking.date} ${segments.find((item) => item.id === Number(booking.segment))?.label || `第 ${booking.segment} 节`}的预约`,
        payload: { bookingId: booking.id },
      },
    }
  }

  return { error: `不支持的工具：${name}` }
}

function normalizeModelContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('')
  }
  return ''
}

function buildSystemPrompt(context) {
  const customPrompt = process.env.DEEPSEEK_SYSTEM_PROMPT_EXTRA || ''
  return [
    '你是“CLASSLINK 专享楼 A 座教室预约平台”的管理员教室信息助手。',
    '你的任务仅限于教室预约相关事项：教室空闲状态、课程占用、学生预约、容量、设施、预约规则和设备状态。',
    '回答必须依据工具返回的实时数据，禁止编造教室、课程、预约人或设备状态。',
    '回答语气要自然、简洁，不要机械地重复系统限制或生硬拒答。',
    '遇到与教室预约无关的话题时，统一自然回复：“我们还是接着说和教室预约相关的吧。”可以再补一句你能查询空闲教室、课程、预约或设备状态。',
    '遇到问候时可以回应问候，但随后仍要把话题带回教室预约。',
    '如果用户的问题含糊，先给当前教室概况，再询问具体日期、节次或教室号。',
    '优先使用工具确认数据，再给结论。回答使用中文，结构简洁，列出教室号和楼层。',
    '当用户要求预约或取消预约时，必须调用 prepare_booking 或 prepare_cancel_booking 生成待确认操作。',
    '待确认操作只代表准备完成，绝不能声称预约或取消已经成功；只有管理员在界面点击确认后，服务端才会执行。',
    '改约或发送通知等未提供写工具的操作，只提供建议，不声称已经执行。',
    `当前查询条件是 ${context.date}，${context.segmentMeta?.label || `第 ${context.segment} 节`}（${context.segmentMeta?.time || ''}）。节次参数是节次块，不是单节课编号：1=第1-2节，2=第3-4节，3=第5-6节，4=第7-8节，5=第9-10节，6=第11-12节。`,
    '可用工具包括教室筛选、教室详情、课程、预约、设备、预约规则，以及预约和取消操作准备。',
    customPrompt,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildAdminAssistantContext(db, date, segment, actor = null) {
  const availability = getAvailability(db, date, segment, null)
  const activeBookings = db.bookings.filter(
    (booking) =>
      booking.status !== 'cancelled' &&
      booking.date === date &&
      Number(booking.segment) <= segment &&
      segment < Number(booking.segment) + Number(booking.duration || 1),
  )
  const bookingMap = new Map(
    activeBookings.map((booking) => [booking.roomId, booking]),
  )

  const rooms = availability.rooms.map((room) => {
    const booking = bookingMap.get(room.roomId)
    const user = booking
      ? db.users.find((item) => item.id === booking.userId)
      : null
    return {
      ...room,
      statusLabel: STATUS_LABELS[room.status] || room.status,
      booking: booking
        ? {
            id: booking.id,
            userName: user?.name || '未知用户',
            userSid: user?.sid || null,
            segment: booking.segment,
            duration: booking.duration || 1,
            purpose: booking.purpose,
          }
        : null,
      device: compactDevice(db.devices?.[room.roomId]),
    }
  })

  return {
    date,
    segment,
    actor: actor
      ? { id: actor.id, name: actor.name, sid: actor.sid, role: actor.role }
      : null,
    users: db.users.map((user) => ({
      id: user.id,
      name: user.name,
      sid: user.sid,
      role: user.role || 'student',
    })),
    bookings: db.bookings
      .filter((booking) => booking.status !== 'cancelled')
      .map((booking) => {
        const user = db.users.find((item) => item.id === booking.userId)
        const room = availability.rooms.find(
          (item) => item.roomId === booking.roomId,
        )
        return {
          ...booking,
          userName: user?.name || '未知用户',
          userSid: user?.sid || null,
          room: room?.room || null,
          floor: room?.floor || null,
        }
      }),
    segmentMeta: segments.find((item) => item.id === segment) || null,
    generatedAt: new Date().toISOString(),
    summary: {
      total: rooms.length,
      free: rooms.filter((room) => room.status === 'free').length,
      class: rooms.filter((room) => room.status === 'class').length,
      reserved: rooms.filter((room) => room.status === 'reserved').length,
      maintenance: rooms.filter((room) => room.status === 'maintenance').length,
      closed: rooms.filter((room) => room.status === 'closed').length,
    },
    rooms,
  }
}

function formatRoom(room) {
  const lines = [
    `${room.floor}F ${room.room} · ${room.type} · ${room.statusLabel}`,
  ]
  if (room.capacity) lines.push(`容量：${room.capacity} 人`)
  if (room.course) {
    lines.push(
      `课程：${room.course.course}，${room.course.teacher}，${room.course.unit}`,
    )
  }
  if (room.booking) {
    lines.push(
      `预约：${room.booking.userName}（${room.booking.userSid || '无学号'}），第 ${room.booking.segment} 节起，持续 ${room.booking.duration} 节，用途：${room.booking.purpose || '未填写'}`,
    )
  }
  if (room.facilities?.length) lines.push(`设施：${room.facilities.join('、')}`)
  if (room.device) {
    lines.push(
      `设备：空调${room.device.acOn ? `开启 ${room.device.acTemp}°C` : '关闭'}，投影${room.device.projectorOn ? '开启' : '关闭'}，开启灯光 ${room.device.activeLights.length} 路`,
    )
  }
  return lines.join('\n')
}

function localReply(messages, context) {
  const latest =
    [...messages].reverse().find((message) => message.role === 'user')
      ?.content || ''
  const room = context.rooms.find(
    (item) =>
      latest.includes(item.room) ||
      latest.toLowerCase().includes(String(item.roomId).toLowerCase()),
  )
  if (room) return formatRoom(room)

  if (/空闲|可约|可用/.test(latest)) {
    const freeRooms = context.rooms.filter((item) => item.status === 'free')
    if (!freeRooms.length) return '当前查询时段没有空闲可预约教室。'
    return [
      `当前查询时段共有 ${freeRooms.length} 间空闲教室：`,
      ...freeRooms.map(
        (item) =>
          `${item.floor}F ${item.room} · ${item.type}${item.capacity ? ` · ${item.capacity} 人` : ''}`,
      ),
    ].join('\n')
  }

  if (/课程|上课|课表/.test(latest)) {
    const classes = context.rooms.filter((item) => item.course)
    if (!classes.length) return '当前查询时段没有课程安排。'
    return [
      `当前查询时段共有 ${classes.length} 门课程：`,
      ...classes.map(
        (item) =>
          `${item.floor}F ${item.room}：${item.course.course}，${item.course.teacher}，${item.course.unit}`,
      ),
    ].join('\n')
  }

  if (/预约|占用|被约/.test(latest)) {
    const occupied = context.rooms.filter((item) => item.booking)
    if (!occupied.length) return '当前查询时段没有被预约的教室。'
    return [
      `当前查询时段共有 ${occupied.length} 条有效预约：`,
      ...occupied.map(
        (item) =>
          `${item.floor}F ${item.room}：${item.booking.userName}（${item.booking.userSid || '无学号'}）`,
      ),
    ].join('\n')
  }

  if (/设备|空调|灯|投影/.test(latest)) {
    const roomsWithDevices = context.rooms.filter((item) => item.device)
    if (!roomsWithDevices.length) {
      return '当前还没有管理员写入过设备状态。'
    }
    return [
      `已记录 ${roomsWithDevices.length} 间教室的设备状态：`,
      ...roomsWithDevices.map(
        (item) =>
          `${item.floor}F ${item.room}：空调${item.device.acOn ? `开启 ${item.device.acTemp}°C` : '关闭'}，投影${item.device.projectorOn ? '开启' : '关闭'}，灯光 ${item.device.activeLights.length} 路`,
      ),
    ].join('\n')
  }

  const classroomRelated =
    /教室|空闲|可约|可用|预约|课程|上课|课表|设备|空调|灯|投影|人数|容量|研讨|自习|冲突|规则|楼层|座位|占用|被约|安排|多媒体|room/i.test(
      latest,
    )
  if (!classroomRelated) {
    return /你好|您好|在吗|谢谢|哈喽|hello|hi/i.test(latest)
      ? '你好，我们还是接着说和教室预约相关的吧。我可以帮你查空闲教室、课程、预约或设备状态。'
      : '我们还是接着说和教室预约相关的吧。'
  }

  return [
    `${context.date} ${context.segmentMeta?.label || `第 ${context.segment} 节`} 的教室概况：`,
    `总教室 ${context.summary.total} 间，空闲 ${context.summary.free} 间，课程占用 ${context.summary.class} 间，已被预约 ${context.summary.reserved} 间，维护或关闭 ${context.summary.maintenance + context.summary.closed} 间。`,
    '可以继续询问具体教室号、空闲教室、课程、预约或设备状态。',
  ].join('\n')
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

function inferDate(text, context) {
  const explicit = text.match(/\d{4}-\d{2}-\d{2}/)?.[0]
  if (explicit) return explicit
  if (text.includes('后天')) return addDays(context.date, 2)
  if (text.includes('明天')) return addDays(context.date, 1)
  return context.date
}

function inferSegment(text, context) {
  const range = text.match(/第\s*(\d+)\s*[-~至]\s*(\d+)\s*节/)
  if (range) return Math.ceil(Number(range[1]) / 2)
  const single = text.match(/第\s*(\d+)\s*节/)
  if (single) return Math.ceil(Number(single[1]) / 2)
  return context.segment
}

function localActionProposal(messages, context) {
  const latest =
    [...messages].reverse().find((message) => message.role === 'user')
      ?.content || ''
  const room = context.rooms.find((item) => latest.includes(item.room))
  if (!room) return null

  if (/取消|撤销/.test(latest)) {
    const result = executeAdminAssistantTool(
      'prepare_cancel_booking',
      {
        room: room.room,
        date: inferDate(latest, context),
        segment: inferSegment(latest, context),
      },
      context,
    )
    return result.action || null
  }

  if (/预约|帮我约|订/.test(latest)) {
    const target = context.users.find(
      (user) =>
        user.role !== 'admin' && user.name && latest.includes(user.name),
    )
    const result = executeAdminAssistantTool(
      'prepare_booking',
      {
        room: room.room,
        date: inferDate(latest, context),
        segment: inferSegment(latest, context),
        duration: 1,
        people: 1,
        purpose: '管理员助手预约',
        studentName: target?.name,
      },
      context,
    )
    return result.action || null
  }

  return null
}

export function getAssistantProvider() {
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      mode: 'deepseek',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    }
  }
  if (process.env.CLASSROOM_ASSISTANT_API_URL) {
    return {
      mode: 'external',
      model: process.env.CLASSROOM_ASSISTANT_MODEL || 'default',
    }
  }
  return { mode: 'local', model: 'rule-based-live-data' }
}

export async function generateAdminAssistantReply({ messages, context }) {
  const provider = getAssistantProvider()
  if (provider.mode === 'local') {
    const pendingAction = localActionProposal(messages, context)
    return {
      reply: pendingAction
        ? `已生成待确认操作：${pendingAction.summary}。请点击确认后执行。`
        : localReply(messages, context),
      provider: provider.mode,
      model: provider.model,
      pendingAction,
    }
  }

  const isDeepSeek = provider.mode === 'deepseek'
  const apiUrl = isDeepSeek
    ? (() => {
        const baseUrl =
          process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com'
        return baseUrl.endsWith('/chat/completions')
          ? baseUrl
          : `${baseUrl.replace(/\/$/, '')}/chat/completions`
      })()
    : process.env.CLASSROOM_ASSISTANT_API_URL
  const apiKey = isDeepSeek
    ? process.env.DEEPSEEK_API_KEY
    : process.env.CLASSROOM_ASSISTANT_API_KEY
  const timeoutMs = Number(
    isDeepSeek
      ? process.env.DEEPSEEK_TIMEOUT_MS || 30000
      : process.env.CLASSROOM_ASSISTANT_TIMEOUT_MS || 20000,
  )
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const agentMessages = [
      { role: 'system', content: buildSystemPrompt(context) },
      {
        role: 'system',
        content: isDeepSeek
          ? `教室概况：${JSON.stringify(context.summary)}`
          : `实时教室上下文：\n${JSON.stringify(context)}`,
      },
      ...messages,
    ]
    const toolsUsed = []
    let pendingAction = null

    for (let round = 0; round < 4; round += 1) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: provider.model,
          temperature: 0.1,
          max_tokens: 1200,
          messages: agentMessages,
          ...(isDeepSeek ? { tools: CLASSROOM_AGENT_TOOLS } : {}),
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `模型接口返回 ${response.status}${errorText ? `: ${errorText.slice(0, 200)}` : ''}`,
        )
      }
      const result = await response.json()
      const choice = result?.choices?.[0]
      const modelMessage = choice?.message
      const toolCalls = Array.isArray(modelMessage?.tool_calls)
        ? modelMessage.tool_calls
        : []
      if (toolCalls.length) {
        agentMessages.push({
          role: 'assistant',
          content: modelMessage.content || '',
          tool_calls: toolCalls,
        })
        toolCalls.forEach((toolCall) => {
          let args = {}
          try {
            args = JSON.parse(toolCall.function?.arguments || '{}')
          } catch {
            args = {}
          }
          toolsUsed.push(toolCall.function?.name)
          const toolResult = executeAdminAssistantTool(
            toolCall.function?.name,
            args,
            context,
          )
          if (toolResult?.action) {
            pendingAction = toolResult.action
          }
          agentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          })
        })
        continue
      }

      const reply = normalizeModelContent(modelMessage?.content)
      if (!reply) {
        throw new Error('模型接口没有返回可识别的回复')
      }
      return {
        reply,
        provider: provider.mode,
        model: result.model || provider.model,
        toolsUsed: [...new Set(toolsUsed)],
        pendingAction,
      }
    }
    throw new Error('模型工具调用次数超过限制')
  } catch (error) {
    return {
      reply: localReply(messages, context),
      provider: 'local-fallback',
      model: provider.model,
      warning: error.message,
    }
  } finally {
    clearTimeout(timeout)
  }
}
