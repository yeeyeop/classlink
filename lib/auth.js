import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'crypto'
import { cookies } from 'next/headers'
import { getDb, mutateDb } from './db'

export const SESSION_COOKIE = 'zuanyilou_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function shouldUseSecureCookie() {
  const override = process.env.COOKIE_SECURE?.toLowerCase()
  if (override === 'true') return true
  if (override === 'false') return false
  return process.env.NODE_ENV === 'production'
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

export function verifyPassword(password, salt, expectedHash) {
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    sid: user.sid,
    college: user.college,
    email: user.email,
    role: user.role || 'student',
  }
}

export async function createSession(userId) {
  const token = randomUUID()
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  await mutateDb((db) => {
    db.sessions[token] = { userId, expiresAt }
    return { value: true, realtime: false }
  })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(),
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  return token
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const db = await getDb()
  const session = db.sessions[token]
  const userId =
    typeof session === 'string' ? session : session?.userId
  const expired =
    typeof session === 'object' &&
    session?.expiresAt &&
    session.expiresAt < Date.now()
  if (!userId || expired) {
    if (expired) {
      await mutateDb((nextDb) => {
        delete nextDb.sessions[token]
        return { realtime: false }
      })
    }
    return null
  }
  const user = db.users.find((item) => item.id === userId)
  return publicUser(user)
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return
  await mutateDb((db) => {
    delete db.sessions[token]
    return { realtime: false }
  })
  cookieStore.delete(SESSION_COOKIE)
}
