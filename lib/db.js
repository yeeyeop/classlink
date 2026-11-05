import { promises as fs } from 'fs'
import path from 'path'
import { publishRealtime } from './realtime.js'

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), '.data')
const dbPath = path.join(dataDir, 'db.json')
const dbBackupPath = path.join(dataDir, 'db.backup.json')

const defaultDb = {
  users: [],
  sessions: {},
  bookings: [],
  notifications: [],
  passwordResets: {},
  devices: {},
  deviceLogs: [],
  assistantLogs: [],
}

function normalizeDb(value) {
  const db = value && typeof value === 'object' ? value : {}
  return {
    ...defaultDb,
    ...db,
    users: Array.isArray(db.users) ? db.users : [],
    sessions:
      db.sessions && typeof db.sessions === 'object' ? db.sessions : {},
    bookings: Array.isArray(db.bookings) ? db.bookings : [],
    notifications: Array.isArray(db.notifications) ? db.notifications : [],
    passwordResets:
      db.passwordResets && typeof db.passwordResets === 'object'
        ? db.passwordResets
        : {},
    devices: db.devices && typeof db.devices === 'object' ? db.devices : {},
    deviceLogs: Array.isArray(db.deviceLogs) ? db.deviceLogs : [],
    assistantLogs: Array.isArray(db.assistantLogs) ? db.assistantLogs : [],
  }
}

async function writeFileAtomic(filePath, content) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tempPath, content, 'utf8')
  await fs.rename(tempPath, filePath)
}

async function initDb() {
  await fs.mkdir(dataDir, { recursive: true })
  try {
    await fs.access(dbPath)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    await writeFileAtomic(dbPath, JSON.stringify(defaultDb, null, 2))
  }
}

async function readDbFromDisk() {
  await initDb()
  const raw = await fs.readFile(dbPath, 'utf8')
  try {
    return normalizeDb(JSON.parse(raw))
  } catch {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const corruptPath = path.join(dataDir, `db.corrupt-${stamp}.json`)
    await fs.copyFile(dbPath, corruptPath)

    try {
      const backupRaw = await fs.readFile(dbBackupPath, 'utf8')
      const recovered = normalizeDb(JSON.parse(backupRaw))
      await writeFileAtomic(dbPath, JSON.stringify(recovered, null, 2))
      return recovered
    } catch {
      throw new Error(`数据库文件损坏，已备份到 ${path.basename(corruptPath)}`)
    }
  }
}

let queue = Promise.resolve()

function enqueue(operation) {
  const next = queue.then(operation, operation)
  queue = next.catch(() => {})
  return next
}

export function getDb() {
  return enqueue(async () => readDbFromDisk())
}

export function saveDb(db) {
  return enqueue(async () => {
    const normalized = normalizeDb(db)
    await initDb()
    try {
      const current = normalizeDb(
        JSON.parse(await fs.readFile(dbPath, 'utf8')),
      )
      await writeFileAtomic(
        dbBackupPath,
        JSON.stringify(current, null, 2),
      )
    } catch {
      // A missing or malformed current file is already handled by the caller.
    }
    await writeFileAtomic(dbPath, JSON.stringify(normalized, null, 2))
    return normalized
  })
}

export function mutateDb(mutator) {
  return enqueue(async () => {
    const db = await readDbFromDisk()
    const result = await mutator(db)
    const nextDb = result?.db || db
    const normalized = normalizeDb(nextDb)
    await writeFileAtomic(dbBackupPath, JSON.stringify(db, null, 2))
    await writeFileAtomic(dbPath, JSON.stringify(normalized, null, 2))
    if (result?.realtime !== false) {
      publishRealtime('db:changed', {
        reason: result?.realtimeReason || 'data-write',
      })
    }
    return result?.value === undefined ? normalized : result.value
  })
}
