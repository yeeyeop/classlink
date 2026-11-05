import { NextResponse } from 'next/server'
import { getSessionUser } from '../../../../../lib/auth'
import { getDb, mutateDb } from '../../../../../lib/db'
import {
  applyDeviceScene,
  createDefaultDeviceState,
  mergeDevicePatch,
} from '../../../../../lib/devices'
import { initialRooms } from '../../../../../src/data.js'

function getRoom(roomId) {
  return initialRooms.find((room) => room.id === roomId)
}

export async function GET(_request, { params }) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }
  const { roomId } = await params
  const room = getRoom(roomId)
  if (!room) {
    return NextResponse.json({ error: '教室不存在' }, { status: 404 })
  }
  const db = await getDb()
  const device =
    db.devices?.[room.id] ||
    Object.assign(createDefaultDeviceState(), {
      updatedAt: null,
      updatedBy: null,
    })
  return NextResponse.json({
    room: { id: room.id, floor: room.floor, room: room.room, type: room.type },
    device,
    logs: (db.deviceLogs || [])
      .filter((item) => item.roomId === room.id)
      .slice(-8)
      .reverse(),
  })
}

export async function PATCH(request, { params }) {
  const admin = await getSessionUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }
  const { roomId } = await params
  const room = getRoom(roomId)
  if (!room) {
    return NextResponse.json({ error: '教室不存在' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const result = await mutateDb((db) => {
      const current =
        db.devices[room.id] || createDefaultDeviceState()
      const next = body.scene
        ? applyDeviceScene(current, body.scene)
        : mergeDevicePatch(current, body.patch || body)
      if (!next) {
        return { value: { error: '设备参数不合法', status: 400 } }
      }
      const updatedAt = new Date().toISOString()
      const device = { ...next, updatedAt, updatedBy: admin.id }
      db.devices[room.id] = device
      db.deviceLogs.push({
        id: `${room.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        roomId: room.id,
        scene: body.scene || null,
        patch: body.patch || body,
        updatedBy: admin.id,
        updatedAt,
      })
      if (db.deviceLogs.length > 500) {
        db.deviceLogs = db.deviceLogs.slice(-500)
      }
      return { value: { device } }
    })
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      )
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('PATCH /api/rooms/:roomId/devices failed:', error)
    return NextResponse.json({ error: '设备控制失败' }, { status: 500 })
  }
}
