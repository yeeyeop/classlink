import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getSessionUser } from '../../../lib/auth'
import { getDb, mutateDb } from '../../../lib/db'
import { validateBooking } from '../../../lib/booking-rules'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ bookings: [] })
  }
  const db = await getDb()
  const bookings = db.bookings
    .filter((item) => item.userId === user.id && item.status !== 'cancelled')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return NextResponse.json({ bookings })
}

export async function POST(request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = await mutateDb((db) => {
      const validation = validateBooking(body, db.bookings)
      if (validation.error) {
        return {
          value: {
            error: validation.error,
            status: validation.status || 400,
          },
        }
      }
      const booking = {
        id: randomUUID(),
        userId: user.id,
        ...validation.value,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        createdBy: user.id,
      }
      delete booking.room
      db.bookings.push(booking)
      return { value: { booking } }
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      )
    }
    return NextResponse.json({ booking: result.booking }, { status: 201 })
  } catch (error) {
    console.error('POST /api/bookings failed:', error)
    return NextResponse.json({ error: '预约失败，请稍后重试' }, { status: 500 })
  }
}

export async function DELETE(request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: '缺少预约编号' }, { status: 400 })
  }
  const deleted = await mutateDb((db) => {
    const booking = db.bookings.find((item) => item.id === id)
    if (!booking || booking.userId !== user.id) {
      return { value: false }
    }
    db.bookings = db.bookings.filter((item) => item.id !== id)
    return { value: true }
  })
  if (!deleted) {
    return NextResponse.json({ error: '预约记录不存在' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
