import { randomBytes, randomUUID, scryptSync } from 'node:crypto'
import { mutateDb } from '../lib/db.js'

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

const config = {
  name: readArg('name') || process.env.ADMIN_NAME || '平台管理员',
  sid: readArg('sid') || process.env.ADMIN_SID,
  email: readArg('email') || process.env.ADMIN_EMAIL,
  college:
    readArg('college') ||
    process.env.ADMIN_COLLEGE ||
    '信息与通信工程学院',
  password: readArg('password') || process.env.ADMIN_PASSWORD,
}

if (!config.sid || !config.email || !config.password) {
  console.error(
    '用法: npm run admin:create -- --sid 2026000001 --email admin2026@bupt.cn --password <至少10位密码> [--name 平台管理员] [--college 信息与通信工程学院]',
  )
  process.exit(1)
}
if (!/^\d{8,12}$/.test(config.sid)) {
  console.error('管理员学号必须为 8-12 位数字')
  process.exit(1)
}
if (!/^[^@\s]+@bupt\.cn$/i.test(config.email)) {
  console.error('管理员必须使用 @bupt.cn 校园邮箱')
  process.exit(1)
}
if (config.password.length < 10) {
  console.error('管理员密码至少需要 10 位')
  process.exit(1)
}

const { salt, hash } = hashPassword(config.password)
const result = await mutateDb((db) => {
  const legacyUserIds = new Set(
    db.users.filter((user) => user.isDemo).map((user) => user.id),
  )
  db.users = db.users.filter((user) => !user.isDemo)
  db.bookings = db.bookings.filter(
    (booking) => !legacyUserIds.has(booking.userId),
  )
  db.notifications = db.notifications.filter(
    (notification) => !legacyUserIds.has(notification.userId),
  )
  db.sessions = {}
  db.assistantLogs = []
  delete db.mailMessages
  legacyUserIds.forEach((userId) => {
    delete db.passwordResets[userId]
  })

  let user = db.users.find((item) => item.sid === config.sid)
  if (!user) {
    user = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
  }
  Object.assign(user, {
    name: config.name,
    sid: config.sid,
    email: config.email.toLowerCase(),
    college: config.college,
    role: 'admin',
    salt,
    passwordHash: hash,
    updatedAt: new Date().toISOString(),
  })
  delete user.isDemo
  return { value: { user, removedLegacyUsers: legacyUserIds.size } }
})

console.log(
  JSON.stringify(
    {
      ok: true,
      sid: result.user.sid,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      removedLegacyUsers: result.removedLegacyUsers,
    },
    null,
    2,
  ),
)
