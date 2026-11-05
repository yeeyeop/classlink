import { NextResponse } from 'next/server'
import { getSessionUser } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'
import { getAvailability } from '../../../../lib/availability'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const date = String(request.nextUrl.searchParams.get('date') || '')
  const segment = Number(request.nextUrl.searchParams.get('segment'))
  if (!DATE_PATTERN.test(date) || !Number.isInteger(segment) || segment < 1 || segment > 6) {
    return NextResponse.json(
      { error: '查询参数需要合法的 date 和 1-6 的 segment' },
      { status: 400 },
    )
  }

  const db = await getDb()
  const availability = getAvailability(db, date, segment, user.id)
  return NextResponse.json(availability, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
