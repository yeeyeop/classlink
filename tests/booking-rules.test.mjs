import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findBookingConflict,
  normalizeBookingInput,
  validateBooking,
} from '../lib/booking-rules.js'
import { getAvailability } from '../lib/availability.js'

const FIXED_NOW = new Date(2026, 8, 10, 8, 0, 0)
const FUTURE_DATE = '2026-09-11'

test('accepts a valid future booking and normalizes numeric fields', () => {
  const result = normalizeBookingInput(
    {
      roomId: 'a2-205',
      date: FUTURE_DATE,
      segment: '2',
      duration: '1',
      people: '2',
      purpose: '小组自习',
    },
    { now: FIXED_NOW },
  )
  assert.equal(result.error, undefined)
  assert.equal(result.value.segment, 2)
  assert.equal(result.value.duration, 1)
  assert.equal(result.value.people, 2)
})

test('rejects malformed date, invalid segment, negative duration and bad people count', () => {
  const base = {
    roomId: 'a2-205',
    date: FUTURE_DATE,
    segment: 2,
    duration: 1,
    people: 1,
  }
  assert.match(
    normalizeBookingInput(
      { ...base, date: 'not-a-date' },
      { now: FIXED_NOW },
    ).error,
    /日期格式/,
  )
  assert.match(
    normalizeBookingInput(
      { ...base, segment: 99 },
      { now: FIXED_NOW },
    ).error,
    /节次/,
  )
  assert.match(
    normalizeBookingInput(
      { ...base, duration: -5 },
      { now: FIXED_NOW },
    ).error,
    /时长/,
  )
  assert.match(
    normalizeBookingInput(
      { ...base, people: 0 },
      { now: FIXED_NOW },
    ).error,
    /人数/,
  )
})

test('rejects past dates and booking time that has already started', () => {
  const base = {
    roomId: 'a2-205',
    segment: 2,
    duration: 1,
    people: 1,
  }
  assert.match(
    normalizeBookingInput(
      { ...base, date: '2026-09-09' },
      { now: FIXED_NOW },
    ).error,
    /过去/,
  )
  assert.match(
    normalizeBookingInput(
      { ...base, date: '2026-09-10', segment: 1 },
      { now: new Date(2026, 8, 10, 9, 0, 0) },
    ).error,
    /已经开始/,
  )
})

test('detects course conflicts for every occupied segment', () => {
  const single = normalizeBookingInput(
    {
      roomId: 'a2-205',
      date: FUTURE_DATE,
      segment: 1,
      duration: 1,
      people: 1,
    },
    { now: FIXED_NOW },
  )
  assert.equal(single.status, 409)

  const spanning = normalizeBookingInput(
    {
      roomId: 'a2-205',
      date: FUTURE_DATE,
      segment: 1,
      duration: 3,
      people: 1,
    },
    { now: FIXED_NOW },
  )
  assert.equal(spanning.status, 409)
})

test('conflict detection ignores cancelled bookings and the edited booking itself', () => {
  const candidate = {
    roomId: 'a2-205',
    date: FUTURE_DATE,
    segment: 2,
    duration: 2,
    people: 1,
    purpose: '自习',
  }
  const existing = [
    {
      id: 'booking-1',
      ...candidate,
      status: 'confirmed',
    },
  ]
  assert.equal(
    validateBooking(candidate, existing, { now: FIXED_NOW }).status,
    409,
  )
  assert.equal(
    validateBooking(candidate, existing, {
      now: FIXED_NOW,
      ignoredBookingId: 'booking-1',
    })
      .error,
    undefined,
  )
  assert.equal(
    findBookingConflict(
      [{ ...existing[0], status: 'cancelled' }],
      candidate,
    ),
    undefined,
  )
})

test('availability exposes other users as reserved and current user as mine', () => {
  const db = {
    bookings: [
      {
        id: 'other-booking',
        userId: 'other-user',
        roomId: 'a2-205',
        date: FUTURE_DATE,
        segment: 2,
        duration: 2,
        status: 'confirmed',
      },
      {
        id: 'cancelled-booking',
        userId: 'other-user',
        roomId: 'a2-208',
        date: FUTURE_DATE,
        segment: 2,
        duration: 1,
        status: 'cancelled',
      },
    ],
  }
  const availability = getAvailability(db, FUTURE_DATE, 2, 'current-user')
  const reservedRoom = availability.rooms.find((room) => room.roomId === 'a2-205')
  const cancelledRoom = availability.rooms.find((room) => room.roomId === 'a2-208')
  assert.equal(reservedRoom.status, 'reserved')
  assert.equal(reservedRoom.isMine, false)
  assert.notEqual(cancelledRoom.status, 'reserved')

  const mine = getAvailability(db, FUTURE_DATE, 2, 'other-user')
  assert.equal(
    mine.rooms.find((room) => room.roomId === 'a2-205').status,
    'mine',
  )
})
