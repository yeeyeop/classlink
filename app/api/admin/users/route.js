import { NextResponse } from 'next/server'
import { getSessionUser } from '../../../../lib/auth'
import { getDb, mutateDb } from '../../../../lib/db'

export async function GET() {
  const admin = await getSessionUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }
  const db = await getDb()
  const users = db.users.map((user) => ({
    id: user.id,
    name: user.name,
    sid: user.sid,
    college: user.college,
    email: user.email,
    role: user.role || 'student',
    createdAt: user.createdAt,
    bookingCount: db.bookings.filter((b) => b.userId === user.id).length,
    latestBooking: db.bookings
      .filter((b) => b.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null,
  }))
  return NextResponse.json({ users })
}

export async function DELETE(request) {
  const admin = await getSessionUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }
  const userId = request.nextUrl.searchParams.get('userId')
  const result = await mutateDb((db) => {
    const user = db.users.find((item) => item.id === userId)
    if (!user) {
      return { value: { error: '用户不存在', status: 404 } }
    }
    if (user.role === 'admin') {
      return { value: { error: '不能注销管理员账号', status: 400 } }
    }
    db.users = db.users.filter((item) => item.id !== userId)
    db.bookings = db.bookings.filter((item) => item.userId !== userId)
    db.notifications = db.notifications.filter(
      (item) => item.userId !== userId,
    )
    delete db.passwordResets[userId]
    Object.keys(db.sessions).forEach((token) => {
      const session = db.sessions[token]
      const sessionUserId =
        typeof session === 'string' ? session : session?.userId
      if (sessionUserId === userId) delete db.sessions[token]
    })
    return { value: { ok: true } }
  })
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
