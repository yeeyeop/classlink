import { NextResponse } from 'next/server'
import { getSessionUser } from '../../../lib/auth'
import { getDb, mutateDb } from '../../../lib/db'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }
  const db = await getDb()
  const notifications = db.notifications
    .filter((item) => item.userId === user.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.readAt).length,
  })
}

export async function PATCH(request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids.map(String) : []
  if (!body.all && !ids.length) {
    return NextResponse.json({ error: '请提供通知编号或 all=true' }, { status: 400 })
  }
  const readAt = new Date().toISOString()
  await mutateDb((db) => {
    db.notifications.forEach((notification) => {
      if (notification.userId !== user.id) return
      if (!body.all && !ids.includes(notification.id)) return
      notification.readAt = notification.readAt || readAt
    })
  })
  return NextResponse.json({ ok: true, readAt })
}
