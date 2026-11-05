import { NextResponse } from 'next/server'
import {
  createSession,
  publicUser,
  verifyPassword,
} from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'

export async function POST(request) {
  try {
    const body = await request.json()
    const sid = String(body.sid || '').trim()
    const password = String(body.password || '')
    const db = await getDb()
    const user = db.users.find((item) => item.sid === sid)

    if (
      !user ||
      !user.salt ||
      !user.passwordHash ||
      !verifyPassword(password, user.salt, user.passwordHash)
    ) {
      return NextResponse.json({ error: '学号或密码不正确' }, { status: 401 })
    }

    await createSession(user.id)
    return NextResponse.json({ user: publicUser(user) })
  } catch {
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 })
  }
}
