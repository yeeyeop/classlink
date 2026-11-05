import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAdminAssistantContext,
  executeAdminAssistantTool,
  getAssistantProvider,
  generateAdminAssistantReply,
} from '../lib/admin-assistant.js'

function dateFromToday(offsetDays) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const TEST_DATE = dateFromToday(1)

const db = {
  users: [
    {
      id: 'student-1',
      name: '测试学生',
      sid: '2024000001',
    },
  ],
  bookings: [
    {
      id: 'booking-1',
      userId: 'student-1',
      roomId: 'a2-205',
      date: TEST_DATE,
      segment: 2,
      duration: 1,
      purpose: '小组讨论',
      status: 'confirmed',
    },
  ],
  devices: {
    'a2-205': {
      ac: { on: true, temp: 24, mode: 'cool' },
      lights: { front: true, middle: true },
      projector: { on: false },
      updatedAt: '2026-09-10T00:00:00.000Z',
    },
  },
}

test('builds admin assistant context with live booking and device data', () => {
  const context = buildAdminAssistantContext(db, TEST_DATE, 2)
  const room = context.rooms.find((item) => item.roomId === 'a2-205')
  assert.equal(room.status, 'reserved')
  assert.equal(room.booking.userName, '测试学生')
  assert.equal(room.device.acOn, true)
  assert.equal(context.summary.total > 0, true)
})

test('local assistant answers room-specific questions from the context', async () => {
  const context = buildAdminAssistantContext(db, TEST_DATE, 2)
  const result = await generateAdminAssistantReply({
    messages: [{ role: 'user', content: '查看 205 教室现在的情况' }],
    context,
  })
  assert.equal(result.provider, 'local')
  assert.match(result.reply, /205/)
  assert.match(result.reply, /测试学生/)
  assert.match(result.reply, /空调开启/)
})

test('local assistant summarizes free rooms without inventing data', async () => {
  const context = buildAdminAssistantContext(db, TEST_DATE, 2)
  const result = await generateAdminAssistantReply({
    messages: [{ role: 'user', content: '还有哪些空闲教室？' }],
    context,
  })
  assert.equal(result.provider, 'local')
  assert.match(result.reply, /空闲教室|没有空闲/)
})

test('classroom agent tools filter live room data', () => {
  const context = buildAdminAssistantContext(db, TEST_DATE, 2)
  const room = executeAdminAssistantTool(
    'get_room',
    { room: '205' },
    context,
  )
  assert.equal(room.roomId, 'a2-205')
  assert.equal(room.booking.userName, '测试学生')

  const reserved = executeAdminAssistantTool(
    'search_rooms',
    { status: 'reserved', limit: 10 },
    context,
  )
  assert.equal(reserved.some((item) => item.roomId === 'a2-205'), true)
})

test('DeepSeek becomes the preferred provider when its key is configured', () => {
  const previousKey = process.env.DEEPSEEK_API_KEY
  const previousModel = process.env.DEEPSEEK_MODEL
  process.env.DEEPSEEK_API_KEY = 'test-key'
  process.env.DEEPSEEK_MODEL = 'deepseek-chat'
  try {
    assert.deepEqual(getAssistantProvider(), {
      mode: 'deepseek',
      model: 'deepseek-chat',
    })
  } finally {
    if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY
    else process.env.DEEPSEEK_API_KEY = previousKey
    if (previousModel === undefined) delete process.env.DEEPSEEK_MODEL
    else process.env.DEEPSEEK_MODEL = previousModel
  }
})

test('local assistant gently redirects unrelated conversation', async () => {
  const context = buildAdminAssistantContext(db, '2026-09-11', 2)
  const result = await generateAdminAssistantReply({
    messages: [{ role: 'user', content: '今天晚饭吃什么？' }],
    context,
  })
  assert.equal(result.reply, '我们还是接着说和教室预约相关的吧。')
})

test('agent prepares booking and cancellation without writing data', () => {
  const context = buildAdminAssistantContext(
    {
      ...db,
      users: [...db.users, { id: 'admin-1', name: '管理员', sid: '2026000001', role: 'admin' }],
    },
    TEST_DATE,
    2,
    { id: 'admin-1', name: '管理员', sid: '2026000001', role: 'admin' },
  )
  const bookingAction = executeAdminAssistantTool(
    'prepare_booking',
    { room: '208', date: TEST_DATE, segment: 2, duration: 1, people: 1 },
    context,
  ).action
  assert.equal(bookingAction.type, 'book')
  assert.equal(bookingAction.payload.targetUserId, 'admin-1')
  assert.equal(context.bookings.length, 1)

  const cancelAction = executeAdminAssistantTool(
    'prepare_cancel_booking',
    { room: '205', date: TEST_DATE, segment: 2 },
    context,
  ).action
  assert.equal(cancelAction.type, 'cancel')
  assert.equal(cancelAction.payload.bookingId, 'booking-1')
})
