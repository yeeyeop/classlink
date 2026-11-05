import { initialRooms, segments } from '../src/data.js'

export const MAX_BOOKING_DAYS_AHEAD = 30
export const MAX_BOOKING_DURATION = 4
export const MAX_PEOPLE = 200

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function overlaps(firstStart, firstDuration, secondStart, secondDuration) {
  return (
    firstStart < secondStart + secondDuration &&
    secondStart < firstStart + firstDuration
  )
}

function toDateParts(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return { year, month, day, date }
}

export function normalizeBookingInput(input, options = {}) {
  const now = options.now || new Date()
  const roomId = String(input?.roomId || '').trim()
  const date = String(input?.date || '').trim()
  const segment = Number(input?.segment)
  const duration = Number(input?.duration ?? 1)
  const people = Number(input?.people ?? 1)
  const purpose = String(input?.purpose || '自习').trim()

  const room = initialRooms.find((item) => item.id === roomId)
  if (!room) return { error: '教室不存在', status: 400 }
  if (!room.reservable) return { error: '该教室暂不支持预约', status: 400 }

  const dateParts = toDateParts(date)
  if (!dateParts) {
    return { error: '日期格式必须为 YYYY-MM-DD', status: 400 }
  }
  if (!Number.isInteger(segment) || !segments.some((item) => item.id === segment)) {
    return { error: '节次必须为 1-6 的整数', status: 400 }
  }
  if (
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > MAX_BOOKING_DURATION
  ) {
    return {
      error: `预约时长必须为 1-${MAX_BOOKING_DURATION} 个节次`,
      status: 400,
    }
  }
  if (segment + duration - 1 > segments.length) {
    return { error: '预约时段超出当天开放范围', status: 400 }
  }
  if (
    !Number.isInteger(people) ||
    people < 1 ||
    people > (room.capacity || MAX_PEOPLE)
  ) {
    return {
      error: room.capacity
        ? `预约人数必须在 1-${room.capacity} 人之间`
        : `预约人数必须在 1-${MAX_PEOPLE} 人之间`,
      status: 400,
    }
  }
  if (!purpose || purpose.length > 80) {
    return { error: '用途不能为空且不能超过 80 个字符', status: 400 }
  }

  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  )
  const target = dateParts.date
  const diffDays = Math.floor((target - today) / 86400000)
  if (diffDays < 0) return { error: '不能预约过去的日期', status: 400 }
  if (diffDays > MAX_BOOKING_DAYS_AHEAD) {
    return {
      error: `最多只能预约未来 ${MAX_BOOKING_DAYS_AHEAD} 天`,
      status: 400,
    }
  }

  if (diffDays === 0) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const firstSelectableSegment =
      segments.find((item) => {
        const [startHour, startMinute] = item.time
          .split('-')[0]
          .split(':')
          .map(Number)
        return nowMinutes < startHour * 60 + startMinute
      })?.id || segments.length + 1
    if (segment < firstSelectableSegment) {
      return { error: '该节次已经开始，不能预约', status: 400 }
    }
  }

  for (let offset = 0; offset < duration; offset += 1) {
    if (room.schedule?.[segment - 1 + offset]) {
      return { error: '该时段教室有课程安排', status: 409 }
    }
  }

  return {
    value: {
      roomId,
      date,
      segment,
      duration,
      people,
      purpose,
      room,
    },
  }
}

export function findBookingConflict(
  bookings,
  candidate,
  ignoredBookingId = null,
) {
  return bookings.find(
    (booking) =>
      booking.id !== ignoredBookingId &&
      booking.status !== 'cancelled' &&
      booking.roomId === candidate.roomId &&
      booking.date === candidate.date &&
      overlaps(
        candidate.segment,
        candidate.duration,
        Number(booking.segment),
        Number(booking.duration || 1),
      ),
  )
}

export function validateBooking(input, bookings, options = {}) {
  const normalized = normalizeBookingInput(input, options)
  if (normalized.error) return normalized
  const conflict = findBookingConflict(
    bookings,
    normalized.value,
    options.ignoredBookingId,
  )
  if (conflict) {
    return { error: '该时段已被其他用户预约', status: 409, conflict }
  }
  return normalized
}

export function isBookingActiveAt(booking, date, segment) {
  const start = Number(booking.segment)
  const duration = Number(booking.duration || 1)
  return (
    booking.status !== 'cancelled' &&
    booking.date === date &&
    segment >= start &&
    segment < start + duration
  )
}
