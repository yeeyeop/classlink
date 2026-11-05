import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getSessionUser } from '../../../../lib/auth'
import { getDb, mutateDb } from '../../../../lib/db'

export async function GET() {
  const admin = await getSessionUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }
  const db = await getDb()
  const notifications = (db.notifications || []).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  return NextResponse.json({ notifications })
}

export async function POST(request) {
  const admin = await getSessionUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }
  const body = await request.json()
  const { userId, title, message } = body
  if (!userId || !title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: '通知信息不完整' }, { status: 400 })
  }
  const result = await mutateDb((db) => {
    const recipients = db.users.some((item) => item.id === userId)
      ? [userId]
      : []
    if (!recipients.length) {
      return { value: { error: '用户不存在', status: 404 } }
    }
    const notifications = recipients.map((recipientId) => ({
      id: randomUUID(),
      userId: recipientId,
      title: String(title).trim().slice(0, 80),
      message: String(message).trim().slice(0, 500),
      readAt: null,
      createdAt: new Date().toISOString(),
      createdBy: admin.id,
    }))
    db.notifications.push(...notifications)
    return { value: { notification: notifications[0], count: 1 } }
  })
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
