import { NextResponse } from 'next/server'
import { getDb, mutateDb } from '../../../../lib/db'
import {
  createResetToken,
  deliverResetToken,
} from '../../../../lib/password-reset'

export async function POST(request) {
  try {
    const body = await request.json()
    const sid = String(body.sid || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    if (!sid || !email) {
      return NextResponse.json({ error: '请填写学号和校园邮箱' }, { status: 400 })
    }

    const db = await getDb()
    const user = db.users.find(
      (item) => item.sid === sid && item.email?.toLowerCase() === email,
    )
    if (!user) {
      return NextResponse.json(
        { error: '学号与校园邮箱不匹配' },
        { status: 404 },
      )
    }

    const { token, tokenHash, expiresAt } = createResetToken()
    const delivery = await deliverResetToken({ email, token })
    await mutateDb((currentDb) => {
      currentDb.passwordResets[user.id] = {
        tokenHash,
        expiresAt,
        usedAt: null,
        createdAt: new Date().toISOString(),
      }
    })

    return NextResponse.json({
      ok: true,
      delivery: delivery.mode,
      expiresInMinutes: 30,
      ...(delivery.mode === 'development' ? { resetToken: token } : {}),
    })
  } catch (error) {
    console.error('POST /api/auth/recover failed:', error)
    return NextResponse.json(
      { error: error.message || '发送重置信息失败' },
      { status: 503 },
    )
  }
}
