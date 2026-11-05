import { NextResponse } from 'next/server'
import { getSessionUser } from '../../../../lib/auth'
import { getDb, mutateDb } from '../../../../lib/db'
import { validateBooking } from '../../../../lib/booking-rules'
import { initialRooms } from '../../../../src/data.js'

function enrichBooking(booking, db) {
  const user = db.users.find((item) => item.id === booking.userId)
  const room = initialRooms.find((item) => item.id === booking.roomId)
  return {
    ...booking,
    user: user
      ? {
          id: user.id,
          name: user.name,
          sid: user.sid,
          college: user.college,
          email: user.email,
        }
      : null,
    room: room
      ? {
          id: room.id,
          floor: room.floor,
          room: room.room,
          type: room.type,
          capacity: room.capacity,
        }
      : null,
  }
}

export async function GET(request) {
  const admin = await getSessionUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const query = String(params.get('q') || '').trim().toLowerCase()
  const date = String(params.get('date') || '').trim()
  const roomId = String(params.get('roomId') || '').trim()
  const status = String(params.get('status') || '').trim()

  const db = await getDb()
  const bookings = db.bookings
    .map((booking) => enrichBooking(booking, db))
    .filter((booking) => {
      if (date && booking.date !== date) return false
      if (roomId && booking.roomId !== roomId) return false
      if (status && booking.status !== status) return false
      if (!query) return true
      const haystack = [
        booking.user?.name,
        booking.user?.sid,
        booking.room?.room,
        booking.room?.type,
        booking.purpose,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
    .sort((a, b) => {
      const byDate = String(a.date).localeCompare(String(b.date))
      if (byDate) return byDate
      const bySegment = Number(a.segment) - Number(b.segment)
      if (bySegment) return bySegment
      return String(b.createdAt).localeCompare(String(a.createdAt))
    })

  return NextResponse.json({
    bookings,
    stats: {
      total: db.bookings.length,
      confirmed: db.bookings.filter((item) => item.status === 'confirmed')
        .length,
      cancelled: db.bookings.filter((item) => item.status === 'cancelled')
        .length,
      filtered: bookings.length,
    },
  })
}

export async function PATCH(request) {
  const admin = await getSessionUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const result = await mutateDb((db) => {
      const booking = db.bookings.find((item) => item.id === body.bookingId)
      if (!booking) {
        return { value: { error: '预约不存在', status: 404 } }
      }

      const nextStatus = body.status || booking.status || 'confirmed'
      if (!['confirmed', 'cancelled'].includes(nextStatus)) {
        return { value: { error: '预约状态不合法', status: 400 } }
      }

      const candidate = {
        roomId: body.roomId || booking.roomId,
        date: body.date || booking.date,
        segment: body.segment ?? booking.segment,
        duration: body.duration ?? booking.duration ?? 1,
        people: body.people ?? booking.people ?? 1,
        purpose: body.purpose ?? booking.purpose ?? '自习',
      }
      if (nextStatus === 'confirmed') {
        const validation = validateBooking(candidate, db.bookings, {
          ignoredBookingId: booking.id,
        })
        if (validation.error) {
          return {
            value: {
              error: validation.error,
              status: validation.status || 400,
            },
          }
        }
        Object.assign(booking, validation.value, { status: nextStatus })
      } else {
        booking.status = nextStatus
      }
      booking.updatedAt = new Date().toISOString()
      booking.updatedBy = admin.id
      return { value: { booking: enrichBooking(booking, db) } }
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      )
    }
    return NextResponse.json({ booking: result.booking })
  } catch (error) {
    console.error('PATCH /api/admin/bookings failed:', error)
    return NextResponse.json({ error: '更新预约失败' }, { status: 500 })
  }
}

export async function DELETE(request) {
  const admin = await getSessionUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: '缺少预约编号' }, { status: 400 })
  }
  const deleted = await mutateDb((db) => {
    const booking = db.bookings.find((item) => item.id === id)
    if (!booking) return { value: false }
    db.bookings = db.bookings.filter((item) => item.id !== id)
    return { value: true }
  })
  if (!deleted) {
    return NextResponse.json({ error: '预约不存在' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, deletedId: id })
}
