import { NextResponse } from 'next/server'
import { getSessionUser } from '../../../../../lib/auth'
import { mutateDb } from '../../../../../lib/db'
import { validateBooking } from '../../../../../lib/booking-rules'

export async function POST(request) {
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
      const validation = validateBooking(
        {
          roomId: body.roomId,
          date: body.date,
          segment: body.segment,
          duration: body.duration ?? 1,
          people: body.people ?? booking.people ?? 1,
          purpose: body.purpose ?? booking.purpose ?? '自习',
        },
        db.bookings,
        { ignoredBookingId: booking.id },
      )
      if (validation.error) {
        return {
          value: {
            error: validation.error,
            status: validation.status || 400,
          },
        }
      }
      Object.assign(booking, validation.value, {
        status: 'confirmed',
        updatedAt: new Date().toISOString(),
        updatedBy: admin.id,
      })
      delete booking.room
      return { value: { booking } }
    })
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      )
    }
    return NextResponse.json({ booking: result.booking })
  } catch (error) {
    console.error('POST /api/admin/bookings/move failed:', error)
    return NextResponse.json({ error: '更改教室失败' }, { status: 500 })
  }
}
