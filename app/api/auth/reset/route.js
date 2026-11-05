import { NextResponse } from 'next/server'
import { hashPassword } from '../../../../lib/auth'
import { mutateDb } from '../../../../lib/db'
import { validateResetToken } from '../../../../lib/password-reset'

export async function POST(request) {
  try {
    const body = await request.json()
    const token = String(body.token || '').trim()
    const password = String(body.password || '')
    if (!token || !password) {
      return NextResponse.json({ error: '请填写重置令牌与新密码' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: '密码至少需要 8 位' }, { status: 400 })
    }

    const result = await mutateDb((db) => {
      const entry = Object.entries(db.passwordResets).find(([, record]) =>
        validateResetToken(record, token),
      )
      if (!entry) {
        return { value: { error: '重置令牌无效或已过期', status: 400 } }
      }
      const [userId, record] = entry
      const user = db.users.find((item) => item.id === userId)
      if (!user) {
        return { value: { error: '用户不存在', status: 404 } }
      }
      const { salt, hash } = hashPassword(password)
      user.salt = salt
      user.passwordHash = hash
      user.passwordUpdatedAt = new Date().toISOString()
      record.usedAt = new Date().toISOString()
      Object.keys(db.sessions).forEach((sessionToken) => {
        const session = db.sessions[sessionToken]
        const sessionUserId =
          typeof session === 'string' ? session : session?.userId
        if (sessionUserId === userId) delete db.sessions[sessionToken]
      })
      return { value: { ok: true } }
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      )
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/auth/reset failed:', error)
    return NextResponse.json({ error: '密码重置失败' }, { status: 500 })
  }
}
