import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSessionUser } from '../../../../../lib/auth'
import { validateBooking } from '../../../../../lib/booking-rules'
import { mutateDb } from '../../../../../lib/db'
import { initialRooms, segments } from '../../../../../src/data'

export async function POST(request) {
  const admin = await getSessionUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const action = body?.action || body
    if (!['book', 'cancel'].includes(action?.type)) {
      return NextResponse.json({ error: '不支持的助手操作' }, { status: 400 })
    }

    const result = await mutateDb((db) => {
      if (action.type === 'book') {
        const target = db.users.find(
          (user) => user.id === action.payload?.targetUserId,
        )
        if (!target) {
          return { value: { error: '预约使用人不存在', status: 404 } }
        }
        const validation = validateBooking(action.payload, db.bookings)
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
          userId: target.id,
          ...validation.value,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          createdBy: admin.id,
          source: 'admin-agent',
        }
        delete booking.room
        db.bookings.push(booking)
        const room = initialRooms.find((item) => item.id === booking.roomId)
        return {
          value: {
            ok: true,
            message: `已为 ${target.name} 预约 ${room.floor}F ${room.room}，${booking.date} ${segments.find((item) => item.id === booking.segment)?.label || `第 ${booking.segment} 节`}`,
            booking,
          },
        }
      }

      const booking = db.bookings.find(
        (item) => item.id === action.payload?.bookingId,
      )
      if (!booking) {
        return { value: { error: '预约不存在', status: 404 } }
      }
      if (booking.status === 'cancelled') {
        return { value: { error: '该预约已经取消', status: 409 } }
      }
      booking.status = 'cancelled'
      booking.cancelledAt = new Date().toISOString()
      booking.cancelledBy = admin.id
      booking.updatedAt = booking.cancelledAt
      return {
        value: {
          ok: true,
          message: `预约 ${booking.date} ${segments.find((item) => item.id === Number(booking.segment))?.label || `第 ${booking.segment} 节`}已取消`,
          booking,
        },
      }
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      )
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/admin/assistant/actions failed:', error)
    return NextResponse.json({ error: '助手操作执行失败' }, { status: 500 })
  }
}
