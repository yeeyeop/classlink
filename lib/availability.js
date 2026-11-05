import { initialRooms, segments } from '../src/data.js'
import { isBookingActiveAt } from './booking-rules.js'

export function getAvailability(db, date, segment, currentUserId = null) {
  const activeBookings = db.bookings.filter(
    (booking) =>
      booking.status !== 'cancelled' &&
      booking.date === date &&
      Number(booking.segment) <= segment &&
      segment < Number(booking.segment) + Number(booking.duration || 1),
  )

  const rooms = initialRooms.map((room) => {
    let status = 'free'
    if (!room.reservable) {
      status = room.note?.includes('未投入') ? 'maintenance' : 'closed'
    } else if (room.schedule?.[segment - 1]) {
      status = 'class'
    }
    const booking = activeBookings.find((item) => item.roomId === room.id)
    if (booking) {
      status = booking.userId === currentUserId ? 'mine' : 'reserved'
    }
    return {
      roomId: room.id,
      floor: room.floor,
      room: room.room,
      type: room.type,
      capacity: room.capacity,
      facilities: room.facilities,
      status,
      bookingId: booking?.id || null,
      isMine: Boolean(booking && booking.userId === currentUserId),
      course: room.schedule?.[segment - 1] || null,
    }
  })

  return {
    date,
    segment,
    segmentMeta: segments.find((item) => item.id === segment) || null,
    rooms,
    occupied: activeBookings.map((booking) => ({
      bookingId: booking.id,
      roomId: booking.roomId,
      segment: Number(booking.segment),
      duration: Number(booking.duration || 1),
      isMine: booking.userId === currentUserId,
      userId: currentUserId ? booking.userId : undefined,
    })),
    generatedAt: new Date().toISOString(),
  }
}

export function bookingContainsSegment(booking, date, segment) {
  return isBookingActiveAt(booking, date, segment)
}
