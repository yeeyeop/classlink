import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const port = 3100
const baseUrl = `http://127.0.0.1:${port}`
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'classlink-smoke-'))
let cookie = ''

const nextBin = path.join(
  process.cwd(),
  'node_modules',
  'next',
  'dist',
  'bin',
  'next',
)
const child = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DATA_DIR: dataDir,
    ALLOW_RESET_TOKEN_RESPONSE: 'true',
    DEEPSEEK_API_KEY: '',
    CLASSROOM_ASSISTANT_API_URL: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

child.stdout.on('data', (chunk) => process.stdout.write(chunk))
child.stderr.on('data', (chunk) => process.stderr.write(chunk))

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/me`)
      if (response.ok) return
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Next.js server did not start in time')
}

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers)
  if (cookie) headers.set('Cookie', cookie)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
  })
  const setCookie = response.headers.getSetCookie?.()[0]
  if (setCookie) cookie = setCookie.split(';')[0]
  const body = await response.json().catch(() => ({}))
  return { response, body }
}

function nextDateString() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function waitForRealtimeChange(reader) {
  const decoder = new TextDecoder()
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await Promise.race([
      reader.read(),
      new Promise((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 250),
      ),
    ])
    if (result.timeout) continue
    if (result.done) return false
    if (decoder.decode(result.value).includes('event: change')) return true
  }
  return false
}

try {
  await waitForServer()

  const removedDemoApis = await Promise.all([
    request('/api/auth/demo', { method: 'POST' }),
    request('/api/auth/admin-demo', {
      method: 'POST',
      body: JSON.stringify({ key: 'wrong' }),
    }),
  ])
  assert.deepEqual(
    removedDemoApis.map((item) => item.response.status),
    [404, 404],
  )

  const sid = String(Date.now()).slice(-10).padStart(10, '1')
  const register = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: '冒烟测试用户',
      sid,
      college: '计算机学院（国家示范性软件学院）',
      email: `${sid}@bupt.cn`,
      password: 'SmokePass123',
    }),
  })
  assert.equal(register.response.status, 200)
  assert.equal(register.body.user.sid, sid)

  const studentAssistantAttempts = await Promise.all([
    request('/api/admin/assistant'),
    request('/api/admin/assistant', {
      method: 'POST',
      body: JSON.stringify({
        date: nextDateString(),
        segment: 2,
        messages: [{ role: 'user', content: '查看空闲教室' }],
      }),
    }),
    request('/api/admin/assistant/actions', {
      method: 'POST',
      body: JSON.stringify({
        action: {
          type: 'cancel',
          payload: { bookingId: 'not-allowed' },
        },
      }),
    }),
  ])
  assert.deepEqual(
    studentAssistantAttempts.map((item) => item.response.status),
    [403, 403, 403],
  )

  const realtimeController = new AbortController()
  const realtimeResponse = await fetch(`${baseUrl}/api/realtime`, {
    headers: { Cookie: cookie },
    signal: realtimeController.signal,
  })
  assert.equal(realtimeResponse.status, 200)
  assert.match(
    realtimeResponse.headers.get('content-type') || '',
    /text\/event-stream/,
  )
  const realtimeReader = realtimeResponse.body.getReader()
  const firstRealtimeChunk = await realtimeReader.read()
  assert.match(
    new TextDecoder().decode(firstRealtimeChunk.value),
    /event: connected/,
  )
  const availability = await request(
    `/api/bookings/availability?date=${nextDateString()}&segment=2`,
  )
  assert.equal(availability.response.status, 200)
  assert.ok(Array.isArray(availability.body.rooms))

  const invalid = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({
      roomId: 'a2-205',
      date: 'not-a-date',
      segment: 99,
      duration: -5,
      people: 0,
    }),
  })
  assert.equal(invalid.response.status, 400)

  const booking = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({
      roomId: 'a2-205',
      date: nextDateString(),
      segment: 2,
      duration: 1,
      people: 1,
      purpose: '端到端测试',
    }),
  })
  assert.equal(booking.response.status, 201)
  assert.ok(booking.body.booking.id)
  assert.equal(await waitForRealtimeChange(realtimeReader), true)
  await realtimeReader.cancel()
  realtimeController.abort()

  const conflict = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({
      roomId: 'a2-205',
      date: nextDateString(),
      segment: 2,
      duration: 1,
      people: 1,
      purpose: '冲突测试',
    }),
  })
  assert.equal(conflict.response.status, 409)

  const mine = await request(
    `/api/bookings/availability?date=${nextDateString()}&segment=2`,
  )
  assert.equal(
    mine.body.rooms.find((room) => room.roomId === 'a2-205').status,
    'mine',
  )

  const notifications = await request('/api/notifications')
  assert.equal(notifications.response.status, 200)

  const recover = await request('/api/auth/recover', {
    method: 'POST',
    body: JSON.stringify({
      sid,
      email: `${sid}@bupt.cn`,
    }),
  })
  assert.equal(recover.response.status, 200)
  assert.ok(recover.body.resetToken)

  const reset = await request('/api/auth/reset', {
    method: 'POST',
    body: JSON.stringify({
      token: recover.body.resetToken,
      password: 'NewSmokePass123',
    }),
  })
  assert.equal(reset.response.status, 200)

  const relogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ sid, password: 'NewSmokePass123' }),
  })
  assert.equal(relogin.response.status, 200)

  const remove = await request(
    `/api/bookings?id=${encodeURIComponent(booking.body.booking.id)}`,
    { method: 'DELETE' },
  )
  assert.equal(remove.response.status, 200)

  const afterDelete = await request(
    `/api/bookings/availability?date=${nextDateString()}&segment=2`,
  )
  assert.equal(
    afterDelete.body.rooms.find((room) => room.roomId === 'a2-205').status,
    'free',
  )

  const adminScript = path.join(process.cwd(), 'scripts', 'create-admin.mjs')
  const adminSeed = spawnSync(
    process.execPath,
    [
      adminScript,
      '--sid',
      '2026000001',
      '--email',
      'admin2026@bupt.cn',
      '--password',
      'Admin@BUPT2026',
      '--name',
      '平台管理员',
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATA_DIR: dataDir },
      encoding: 'utf8',
    },
  )
  assert.equal(adminSeed.status, 0, adminSeed.stderr)

  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      sid: '2026000001',
      password: 'Admin@BUPT2026',
    }),
  })
  assert.equal(adminLogin.response.status, 200)
  assert.equal(adminLogin.body.user.role, 'admin')

  const adminBookings = await request('/api/admin/bookings')
  assert.equal(adminBookings.response.status, 200)

  const assistant = await request('/api/admin/assistant', {
    method: 'POST',
    body: JSON.stringify({
      date: nextDateString(),
      segment: 2,
      messages: [{ role: 'user', content: '当前还有哪些空闲教室？' }],
    }),
  })
  assert.equal(assistant.response.status, 200)
  assert.match(assistant.body.reply, /空闲|教室/)

  const assistantLogs = await request('/api/admin/assistant?limit=5')
  assert.equal(assistantLogs.response.status, 200)
  assert.equal(assistantLogs.body.logs.length > 0, true)

  const bookingPreview = await request('/api/admin/assistant', {
    method: 'POST',
    body: JSON.stringify({
      date: nextDateString(),
      segment: 2,
      messages: [
        { role: 'user', content: '帮我预约 205 第3-4节，用于测试' },
      ],
    }),
  })
  assert.equal(bookingPreview.response.status, 200)
  assert.equal(bookingPreview.body.pendingAction.type, 'book')

  const bookingAction = await request('/api/admin/assistant/actions', {
    method: 'POST',
    body: JSON.stringify({ action: bookingPreview.body.pendingAction }),
  })
  assert.equal(bookingAction.response.status, 200)
  assert.equal(bookingAction.body.ok, true)

  const cancelPreview = await request('/api/admin/assistant', {
    method: 'POST',
    body: JSON.stringify({
      date: nextDateString(),
      segment: 2,
      messages: [{ role: 'user', content: '取消 205 第3-4节的预约' }],
    }),
  })
  assert.equal(cancelPreview.response.status, 200)
  assert.equal(cancelPreview.body.pendingAction.type, 'cancel')

  const cancelAction = await request('/api/admin/assistant/actions', {
    method: 'POST',
    body: JSON.stringify({ action: cancelPreview.body.pendingAction }),
  })
  assert.equal(cancelAction.response.status, 200)
  assert.equal(cancelAction.body.ok, true)

  console.log(
    'Smoke test passed: auth, realtime, validation, conflict, availability, notifications, password reset, delete, admin, assistant, agent actions.',
  )
} finally {
  child.kill()
  await rm(dataDir, { recursive: true, force: true })
}
