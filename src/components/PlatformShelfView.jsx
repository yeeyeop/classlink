'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bot,
  BookOpen,
  Boxes,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  GraduationCap,
  LayoutGrid,
  MapPin,
  Moon,
  Radio,
  Sun,
  Users,
  VideoOff,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { building, floors, initialRooms, segments } from '../data'
import AdminConsole from './AdminConsole'
import AdminAssistant from './AdminAssistant'
import CampusDigitalTwin from './CampusDigitalTwin'
import DeviceControlPanel from './DeviceControlPanel'
import NotificationCenter from './NotificationCenter'

// 楼层命名与主题（依 data.js 各层用途归纳）
const FLOOR_META = {
  1: { name: '创新实践区', desc: '共享工位 · 路演区 · 智慧教室' },
  2: { name: '智慧教学区', desc: '标准智慧教室 · 团体辅导室' },
  3: { name: '综合教学与实验区', desc: '研讨室 · 三地联合实验室 · 智慧教室' },
  4: { name: '专业实验区', desc: '电路 / 物理 / 数字人 / 录音 · 智慧教室' },
  5: { name: '办公与研讨区', desc: '会议室 · 研讨室 · 教工活动区 · 办公室' },
}

// 状态 → 克制配色（黑白衬线体系，状态色仅作小面积色条/点）
const STATUS = {
  free: { bar: 'bg-emerald-300', dot: 'bg-emerald-300', text: 'text-emerald-200', label: '空闲可约' },
  class: { bar: 'bg-amber-300', dot: 'bg-amber-300', text: 'text-amber-200', label: '上课中' },
  reserved: { bar: 'bg-sky-300', dot: 'bg-sky-300', text: 'text-sky-200', label: '已被预约' },
  mine: { bar: 'bg-blue-300', dot: 'bg-blue-300', text: 'text-blue-200', label: '我的预约' },
  maintenance: { bar: 'bg-white/25', dot: 'bg-white/30', text: 'text-white/50', label: '未投入' },
  pending: { bar: 'bg-white/25', dot: 'bg-white/30', text: 'text-white/50', label: '未投入' },
  closed: { bar: 'bg-white/15', dot: 'bg-white/20', text: 'text-white/40', label: '不可约' },
}

function toDateInput(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function segmentStartMinutes(segment) {
  const [hour, minute] = segment.time.split('-')[0].split(':').map(Number)
  return hour * 60 + minute
}

function getInitialSelection(now = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nextIndex = segments.findIndex(
    (segment) => nowMinutes < segmentStartMinutes(segment),
  )
  return nextIndex >= 0
    ? { segmentIdx: nextIndex, dateOffset: 0 }
    : { segmentIdx: 0, dateOffset: 1 }
}

const INITIAL_SELECTION = getInitialSelection()

const NEXT_DAYS = Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() + index)
  return {
    value: toDateInput(date),
    label: new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      weekday: index === 0 ? 'short' : undefined,
    }).format(date),
  }
})

const CAMERA_BASE_URL = process.env.NEXT_PUBLIC_CAMERA_BASE_URL || ''

/**
 * 第三页：空教室总览（风格对齐首页 / 登录页：
 * 2D 背景（纯色层 + 简单线条）· 黑白衬线 · 玻璃卡片 · 白色主按钮）
 */
export default function PlatformShelfView({ session, onBack }) {
  const [toast, setToast] = useState(null)
  const [segmentIdx, setSegmentIdx] = useState(INITIAL_SELECTION.segmentIdx)
  const [dateOffset, setDateOffset] = useState(INITIAL_SELECTION.dateOffset)
  const [lightMode, setLightMode] = useState(false)
  const [onlyBookable, setOnlyBookable] = useState(false)
  const [modal, setModal] = useState(null)
  const [bookingRoom, setBookingRoom] = useState(null)
  const [bookings, setBookings] = useState([])
  const [availability, setAvailability] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [twinRoom, setTwinRoom] = useState(null)
  const [controlRoom, setControlRoom] = useState(null)
  const [deviceState, setDeviceState] = useState(null)
  const [deviceSaving, setDeviceSaving] = useState(false)
  const [deviceLogs, setDeviceLogs] = useState([])
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const isAdmin = session?.role === 'admin'

  const selectedDate = NEXT_DAYS[dateOffset].value
  const currentSegment = segments[segmentIdx]
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const showToast = (msg) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2400)
  }

  const loadBookings = useCallback(() => {
    fetch('/api/bookings')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.bookings)) setBookings(result.bookings)
      })
      .catch(() => {})
  }, [])

  const loadAvailability = useCallback(async () => {
    const params = new URLSearchParams({
      date: selectedDate,
      segment: String(segmentIdx + 1),
    })
    try {
      const response = await fetch(`/api/bookings/availability?${params}`, {
        cache: 'no-store',
      })
      const result = await response.json()
      if (response.ok) {
        setAvailability(result)
        setLastSyncedAt(result.generatedAt)
      }
    } catch {
      // Keep the last successful availability snapshot.
    }
  }, [selectedDate, segmentIdx])

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok) {
        setNotifications(result.notifications || [])
        setUnreadCount(result.unreadCount || 0)
      }
    } catch {
      // Notification refresh is best-effort.
    }
  }, [])

  const refreshOperationalData = useCallback(async () => {
    await Promise.all([
      loadBookings(),
      loadAvailability(),
      loadNotifications(),
    ])
  }, [loadBookings, loadAvailability, loadNotifications])

  const loadDeviceState = async (roomId) => {
    const response = await fetch(`/api/rooms/${roomId}/devices`, {
      cache: 'no-store',
    })
    const result = await response.json()
    if (response.ok) {
      setDeviceState(result.device)
      setDeviceLogs(result.logs || [])
    }
  }

  const openDeviceControl = (room) => {
    setControlRoom(room)
    setDeviceState(null)
    setModal('control')
    loadDeviceState(room.id)
  }

  useEffect(() => {
    if (!session) return
    loadBookings()
    loadNotifications()
  }, [session, loadBookings, loadNotifications])

  useEffect(() => {
    if (!session) return
    loadAvailability()
  }, [session, selectedDate, segmentIdx, loadAvailability])

  useEffect(() => {
    if (!session) return undefined
    const timer = window.setInterval(() => {
      loadAvailability()
      loadNotifications()
    }, 60000)
    return () => window.clearInterval(timer)
  }, [session, selectedDate, segmentIdx, loadAvailability, loadNotifications])

  useEffect(() => {
    if (!session) return undefined
    let refreshTimer
    const source = new EventSource('/api/realtime')
    source.addEventListener('connected', () => {
      setRealtimeConnected(true)
    })
    source.addEventListener('change', () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        refreshOperationalData()
      }, 120)
    })
    source.onerror = () => {
      setRealtimeConnected(false)
    }
    return () => {
      window.clearTimeout(refreshTimer)
      source.close()
    }
  }, [session, refreshOperationalData])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (dateOffset !== 0) return
    const currentStarted =
      nowMinutes >= segmentStartMinutes(segments[segmentIdx])
    if (!currentStarted) return
    const nextIndex = segments.findIndex(
      (segment, index) =>
        index > segmentIdx && nowMinutes < segmentStartMinutes(segment),
    )
    if (nextIndex >= 0) {
      setSegmentIdx(nextIndex)
    } else {
      setDateOffset(1)
      setSegmentIdx(0)
    }
  }, [dateOffset, nowMinutes, segmentIdx])

  useEffect(() => {
    if (!isAdmin) return undefined
    const handleEscape = (event) => {
      if (event.key === 'Escape') setAssistantOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isAdmin])

  const hasReservation = bookings.length > 0
  const canViewCameras = isAdmin || hasReservation

  const confirmReserve = async () => {
    if (!bookingRoom) return
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: bookingRoom.id,
        date: selectedDate,
        segment: segmentIdx + 1,
        duration: 1,
        purpose: '自习',
        people: 1,
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      showToast(result.error || '预约失败')
      return
    }
    showToast(`${bookingRoom.floor} 层 ${bookingRoom.room} 已预约`)
    setBookingRoom(null)
    await refreshOperationalData()
  }

  const saveDevice = async (payload, successMessage) => {
    if (!controlRoom) return
    setDeviceSaving(true)
    try {
      const response = await fetch(`/api/rooms/${controlRoom.id}/devices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        showToast(result.error || '设备控制失败')
        return
      }
      setDeviceState(result.device)
      const logResponse = await fetch(`/api/rooms/${controlRoom.id}/devices`, {
        cache: 'no-store',
      })
      if (logResponse.ok) {
        const logData = await logResponse.json()
        setDeviceLogs(logData.logs || [])
      }
      if (successMessage) showToast(successMessage)
    } catch {
      showToast('设备控制请求失败')
    } finally {
      setDeviceSaving(false)
    }
  }

  const markAllNotificationsRead = async () => {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    if (response.ok) {
      setUnreadCount(0)
      setNotifications((items) =>
        items.map((item) => ({
          ...item,
          readAt: item.readAt || new Date().toISOString(),
        })),
      )
    }
  }

  const cancelReservation = async (bookingId) => {
    const response = await fetch(
      `/api/bookings?id=${encodeURIComponent(bookingId)}`,
      { method: 'DELETE' },
    )
    if (response.ok) showToast('预约已取消')
    await refreshOperationalData()
  }

  const allRoomStates = useMemo(() => {
    const availabilityMatchesCurrentQuery =
      availability?.date === selectedDate &&
      availability?.segment === segmentIdx + 1
    const availabilityMap = new Map(
      (availabilityMatchesCurrentQuery ? availability.rooms : []).map((room) => [
        room.roomId,
        room,
      ]),
    )
    return initialRooms.map((room) => {
      let status = 'free'
      const availabilityRoom = availabilityMap.get(room.id)
      if (!room.reservable) {
        status = room.note?.includes('未投入') ? 'maintenance' : 'closed'
      } else if (availabilityRoom?.status) {
        status = availabilityRoom.status
      } else if (room.schedule?.[segmentIdx]) {
        status = 'class'
      }
      return {
        ...room,
        status,
        bookingId: availabilityRoom?.bookingId || null,
        isMine: Boolean(availabilityRoom?.isMine),
      }
    })
  }, [availability, selectedDate, segmentIdx])

  const shelfData = useMemo(() => {
    return floors.map((floor) => {
      const rooms = allRoomStates
        .filter((r) => r.floor === floor)
        .filter((room) => !onlyBookable || room.status === 'free')
      // 类型分布
      const typeCount = {}
      rooms.forEach((r) => {
        typeCount[r.type] = (typeCount[r.type] || 0) + 1
      })
      // 当前时段正在上的课
      const classes = rooms
        .filter((r) => r.schedule?.[segmentIdx])
        .map((r) => ({ room: r.room, type: r.type, ...r.schedule[segmentIdx] }))
      return {
        floor,
        rooms,
        free: rooms.filter((r) => r.status === 'free').length,
        busy: rooms.filter((r) => r.status === 'class').length,
        pending: rooms.filter((r) => r.status === 'maintenance').length,
        typeCount,
        classes,
      }
    })
  }, [segmentIdx, onlyBookable, allRoomStates])

  const totalRooms = shelfData.reduce((s, x) => s + x.rooms.length, 0)
  const totalFree = shelfData.reduce((s, x) => s + x.free, 0)
  const totalBusy = shelfData.reduce((s, x) => s + x.busy, 0)
  const totalPending = shelfData.reduce((s, x) => s + x.pending, 0)
  const freeRate = totalRooms ? Math.round((totalFree / totalRooms) * 100) : 0
  const selectedTwinRoom = twinRoom
    ? allRoomStates.find((room) => room.id === twinRoom.id) || twinRoom
    : null

  return (
    <main
      className="relative min-h-screen w-full bg-[#060708] font-song text-white"
      style={lightMode ? { filter: 'invert(1) hue-rotate(180deg)' } : undefined}
    >
      {/* ===== 2D 背景：纯色层 + 简单线条（区别于首页/登录页的视频 + 3D 背景）===== */}
      <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* 纯色色层 */}
        <div className="absolute right-[8%] top-[10%] h-[42vh] w-[42vh] bg-[#0b1c36]/45" />
        <div className="absolute bottom-[12%] left-[6%] h-[32vh] w-[32vh] rounded-full bg-[#0a1626]/35" />
        <div className="absolute left-[40%] top-[55%] h-[24vh] w-[24vh] bg-[#101d35]/25" />
        {/* 简单线条：纵向栅格 */}
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:96px_100%]" />
        {/* 简单线条：横向层板线 */}
        <div className="absolute left-0 right-0 top-[28%] h-px bg-white/10" />
        <div className="absolute left-0 right-0 top-[52%] h-px bg-white/[0.08]" />
        <div className="absolute left-0 right-0 bottom-[22%] h-px bg-white/10" />
        {/* 简单线条：纵向边线 */}
        <div className="absolute inset-y-0 left-[22%] w-px bg-white/[0.08]" />
        <div className="absolute inset-y-0 right-[18%] w-px bg-white/[0.08]" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-[1] bg-gradient-to-b from-black/40 via-transparent to-black/55" />

      <div className="relative z-10">
        {/* ===== 顶栏（与首页一致：校徽 + 右侧操作）===== */}
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 md:px-10">
          <button type="button" className="flex items-center" onClick={onBack}>
            <Image
              src="/bupt-logo.png"
              alt="北京邮电大学校徽"
              width={160}
              height={64}
              className="h-12 w-auto sm:h-14"
              style={{ width: 'auto' }}
            />
          </button>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-1.5 lg:flex">
              <button
                type="button"
                onClick={() => setModal('reservations')}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/75 hover:bg-white/10"
              >
                我的预约
              </button>
              <button
                type="button"
                onClick={() => setModal('twin')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/20 px-3 py-2 text-xs text-emerald-100 hover:bg-emerald-400/10"
              >
                <Boxes size={12} />
                3D 楼宇
              </button>
              <button
                type="button"
                onClick={() => setModal('notifications')}
                className="relative inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/75 hover:bg-white/10"
              >
                <Bell size={12} />
                通知
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-sky-400 px-1 text-center text-[9px] font-semibold leading-4 text-black">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (canViewCameras) {
                    setModal('cameras')
                  } else {
                    showToast('预约成功后即可查看监控')
                  }
                }}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/75 hover:bg-white/10"
              >
                监控
              </button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const room =
                        initialRooms.find((item) => item.reservable) ||
                        initialRooms[0]
                      openDeviceControl(room)
                    }}
                    className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/10"
                  >
                    中控
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModal('admin')
                    }}
                    className="rounded-lg border border-violet-300/30 px-3 py-2 text-xs text-violet-100 hover:bg-violet-400/10"
                  >
                    管理
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setLightMode((value) => !value)}
                aria-label="亮色模式"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-white/75 hover:bg-white/10"
              >
                {lightMode ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
            <span
              title={
                realtimeConnected
                  ? '已连接实时数据通道'
                  : '实时连接重试中，仍会每分钟兜底刷新'
              }
              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] lg:inline-flex ${
                realtimeConnected
                  ? 'border-emerald-300/20 bg-emerald-400/[0.06] text-emerald-100'
                  : 'border-amber-300/20 bg-amber-400/[0.06] text-amber-100'
              }`}
            >
              {realtimeConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {realtimeConnected ? '实时同步' : '重连中'}
            </span>
            <span className="hidden text-xs text-white/55 sm:block">
              {session?.name ? `${session.name} · 已登录` : '样例预览'}
            </span>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-4 py-2 text-sm text-white/85 transition-colors hover:bg-white/10"
            >
              <ArrowLeft size={14} />
              {session?.name ? '退出登录' : '返回首页'}
            </button>
          </div>
        </nav>

        <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-1.5 px-6 pb-1 lg:hidden">
          <button
            type="button"
            onClick={() => setModal('reservations')}
            className="rounded-lg border border-white/12 px-3 py-2 text-[11px] text-white/65"
          >
            我的预约
          </button>
          <button
            type="button"
            onClick={() => setModal('twin')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/20 px-3 py-2 text-[11px] text-emerald-100"
          >
            <Boxes size={11} />
            3D
          </button>
          <button
            type="button"
            onClick={() => setModal('notifications')}
            className="relative inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-2 text-[11px] text-white/65"
          >
            <Bell size={11} />
            通知
            {unreadCount > 0 && (
              <span className="rounded-full bg-sky-400 px-1 text-[9px] font-semibold text-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setModal('admin')}
              className="rounded-lg border border-violet-300/25 px-3 py-2 text-[11px] text-violet-100"
            >
              管理
            </button>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] ${
              realtimeConnected
                ? 'border-emerald-300/20 text-emerald-100'
                : 'border-amber-300/20 text-amber-100'
            }`}
          >
            {realtimeConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {realtimeConnected ? '实时同步' : '重连中'}
          </span>
        </div>

        {/* ===== 标题区 ===== */}
        <header className="mx-auto max-w-6xl px-6 pb-8 pt-6 text-center md:px-10 md:pt-10">
          <p className="mb-4 text-[11px] tracking-[0.3em] text-white/50">
            {building.university} · {building.campus} · {building.name}
          </p>
          <h1
            className="text-3xl font-medium leading-none tracking-[0.22em] text-white/90 sm:text-5xl"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            CLASSLINK
          </h1>
          <h2
            className="mt-5 text-lg font-normal tracking-[0.25em] text-white/70 sm:text-2xl"
            style={{
              fontFamily: '"Noto Serif SC", STSong, SimSun, "Songti SC", serif',
            }}
          >
            五层教室 一目了然
          </h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/55">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              空闲可约
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              上课中
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
              他人已约
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              我的预约
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
              未投入
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOnlyBookable((value) => !value)}
            className={`mt-5 rounded-full border px-5 py-2 text-xs transition-colors ${
              onlyBookable
                ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-200'
                : 'border-white/15 text-white/65 hover:bg-white/10'
            }`}
          >
            {onlyBookable ? '正在查看可约教室' : '一键筛选可预约教室'}
          </button>
        </header>

        {/* ===== 时段切换器 ===== */}
        <section className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
            <CalendarDays size={14} className="text-white/45" />
            {NEXT_DAYS.map((day, index) => (
              <button
                key={day.value}
                type="button"
                onClick={() => setDateOffset(index)}
                className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${
                  dateOffset === index
                    ? 'bg-white text-black'
                    : 'border border-white/15 text-white/60 hover:text-white'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-black/60 p-1.5 backdrop-blur-xl">
            {segments.map((seg, idx) => {
              const active = idx === segmentIdx
              const started =
                dateOffset === 0 && nowMinutes >= segmentStartMinutes(seg)
              return (
                <button
                  key={seg.id}
                  type="button"
                  disabled={started}
                  onClick={() => setSegmentIdx(idx)}
                  className={`flex flex-col items-center rounded-xl px-3.5 py-2 text-center transition-colors sm:px-4 ${
                    started
                      ? 'cursor-not-allowed text-white/20'
                      : active
                      ? 'bg-white text-black'
                      : 'text-white/65 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px] font-medium tracking-wide sm:text-xs">
                    {seg.label}
                  </span>
                  <span
                    className={`mt-0.5 text-[9px] tracking-wider sm:text-[10px] ${
                      started
                        ? 'text-white/15'
                        : active
                          ? 'text-black/55'
                          : 'text-white/35'
                    }`}
                  >
                    {started ? '已开始' : seg.time}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ===== 统计概览 ===== */}
        <section className="mx-auto max-w-6xl px-6 pt-8 md:px-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="总教室" value={totalRooms} icon={LayoutGrid} />
            <StatCard
              label="空闲可约"
              value={totalFree}
              icon={DoorOpen}
              tone="emerald"
            />
            <StatCard
              label="上课中"
              value={totalBusy}
              icon={BookOpen}
              tone="amber"
            />
            <StatCard
              label="未投入"
              value={totalPending}
              icon={CheckCircle2}
              tone="muted"
            />
          </div>
          {/* 空闲率进度条 */}
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-xl">
            <span className="text-xs text-white/55">空闲率</span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-emerald-300 transition-all duration-500"
                style={{ width: `${freeRate}%` }}
              />
            </div>
            <span className="text-sm font-medium tabular-nums text-white/85">
              {freeRate}%
            </span>
            <span className="hidden text-[11px] text-white/40 sm:inline">
              当前时段 {currentSegment.label} {currentSegment.time}
            </span>
          </div>
        </section>

        {/* ===== 楼层详尽总览：每层一全宽面板，自上而下堆叠（1F → 5F）===== */}
        <section className="mx-auto max-w-6xl px-6 py-10 md:px-10">
          <div className="mb-5 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-white/85">
              <LayoutGrid size={15} />
              楼层教室总览
            </p>
            <p className="text-xs text-white/45">
              自底层向上 · 共 {shelfData.length} 层 {totalRooms} 间教室
            </p>
          </div>

          <div className="space-y-5">
            {shelfData.map((shelf) => {
              const meta = FLOOR_META[shelf.floor] || {}
              return (
                <div
                  key={shelf.floor}
                  className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05] backdrop-blur transition-colors hover:border-white/22"
                >
                  {/* 层头 */}
                  <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <div className="flex items-start gap-4">
                      <p
                        className="text-4xl leading-none text-white/90"
                        style={{
                          fontFamily: '"Times New Roman", Times, serif',
                        }}
                      >
                        {shelf.floor}
                        <span className="ml-1 align-top text-xs text-white/50">
                          F
                        </span>
                      </p>
                      <div>
                        <p className="text-sm font-semibold tracking-wide text-white/85">
                          {meta.name}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                          {meta.desc}
                        </p>
                      </div>
                    </div>

                    {/* 层统计 */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-emerald-200">
                        <DoorOpen size={13} />
                        空闲 {shelf.free}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-amber-200">
                        <BookOpen size={13} />
                        上课 {shelf.busy}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-white/45">
                        <CheckCircle2 size={13} />
                        未投入 {shelf.pending}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-white/55">
                        <LayoutGrid size={13} />
                        共 {shelf.rooms.length} 间
                      </span>
                    </div>
                  </div>

                  {/* 类型分布条 */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[11px] text-white/50 sm:px-7">
                    <span className="text-white/40">类型分布</span>
                    {Object.entries(shelf.typeCount).map(([type, count]) => (
                      <span key={type} className="inline-flex items-center gap-1">
                        {type}
                        <span className="rounded bg-white/10 px-1 tabular-nums text-white/70">
                          {count}
                        </span>
                      </span>
                    ))}
                  </div>

                  {/* 教室详情网格 */}
                  <div className="grid grid-cols-1 gap-px bg-white/5 sm:grid-cols-2 lg:grid-cols-3">
                    {shelf.rooms.map((room) => {
                      const st = STATUS[room.status] || STATUS.closed
                      const lesson = room.schedule?.[segmentIdx]
                      const clickable = room.status === 'free'
                      return (
                        <div
                          key={room.id}
                          className={`flex flex-col bg-black/40 p-4 transition-colors ${
                            clickable
                              ? 'cursor-pointer hover:bg-white/[0.06]'
                              : 'cursor-default'
                          }`}
                          onClick={
                            clickable
                              ? () => setBookingRoom(room)
                              : room.status === 'mine'
                                ? () => setModal('reservations')
                                : undefined
                          }
                        >
                          {/* 行1：房间号 + 状态 */}
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-lg font-medium text-white/90">
                              {room.room}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.text}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                          </div>

                          {/* 行2：类型 + 容量 */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/55">
                            <span>{room.type}</span>
                            {room.capacity > 0 && (
                              <span className="inline-flex items-center gap-1 text-white/45">
                                <Users size={11} />
                                {room.capacity} 人
                              </span>
                            )}
                          </div>

                          {/* 行3：当前课程 / 备注 */}
                          {lesson ? (
                            <div className="mt-2 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-2 py-1.5">
                              <p className="text-[11px] font-medium leading-tight text-amber-100">
                                {lesson.course}
                              </p>
                              <p className="mt-0.5 text-[10px] text-amber-200/70">
                                {lesson.teacher} · {lesson.unit}
                              </p>
                            </div>
                          ) : room.note ? (
                            <p className="mt-2 text-[11px] leading-relaxed text-white/40">
                              {room.note}
                            </p>
                          ) : (
                            <p className="mt-2 text-[11px] text-emerald-200/60">
                              本时段空闲
                            </p>
                          )}

                          {/* 行4：设施 */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {room.facilities.map((f) => (
                              <span
                                key={f}
                                className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/45"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 层底操作 */}
                  <div className="flex flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row sm:px-7">
                    {shelf.classes.length > 0 ? (
                      <div className="min-w-0">
                        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-white/55">
                          <GraduationCap size={12} />
                          本时段课程 {shelf.classes.length} 门
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/50">
                          {shelf.classes.map((c) => (
                            <span key={c.room}>
                              <span className="font-mono text-white/70">
                                {c.room}
                              </span>{' '}
                              {c.course} · {c.teacher}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-white/40">
                        本时段无课程安排
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-white/45">
                      <ArrowRight size={13} />
                      直接点击上方空闲教室即可预约
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 尾卡 */}
          <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-transparent p-6 text-center">
            <CheckCircle2 size={20} className="text-emerald-200" />
            <p className="mt-2 text-sm font-medium text-white/85">
              今日数据已同步
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              每一间教室的安排都清晰可见，空闲时段即刻锁定。
            </p>
            <p className="mt-3 text-[10px] tracking-wider text-white/30">
              {realtimeConnected ? 'SSE 实时联动' : '每分钟兜底同步'} ·{' '}
              {lastSyncedAt
                ? new Date(lastSyncedAt).toLocaleTimeString('zh-CN')
                : '等待同步'}
            </p>
          </div>
        </section>

        {/* ===== 底部信息栏（与首页一致）===== */}
        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-[11px] tracking-wide text-white/45 md:px-10">
            <span className="hidden items-center gap-1.5 sm:flex">
              <MapPin size={12} />
              {building.address}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarClock size={12} />
              开放时间 08:00 - 22:00
            </span>
          </div>
        </footer>
      </div>

      {/* 直接预约 */}
      {bookingRoom && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/12 bg-[#0b0e16] p-6 text-white sm:rounded-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-white/50">
                  {bookingRoom.floor} 层 · {bookingRoom.type}
                </p>
                <h3 className="mt-1 text-2xl font-semibold">
                  预约 {bookingRoom.room} 教室
                </h3>
                <p className="mt-1 text-xs text-white/45">
                  {selectedDate} · {segments[segmentIdx].label}{' '}
                  {segments[segmentIdx].time}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingRoom(null)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10"
              >
                关闭
              </button>
            </div>
            <button
              type="button"
              onClick={confirmReserve}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-black"
            >
              <CheckCircle2 size={16} />
              确认预约此教室
            </button>
          </div>
        </div>
      )}

      {/* 我的预约 */}
      {modal === 'reservations' && (
        <ModalShell title="我的预约" onClose={() => setModal(null)}>
          {bookings.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/50">
              还没有预约记录
            </p>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => {
                const room = initialRooms.find(
                  (item) => item.id === booking.roomId,
                )
                return (
                  <div
                    key={booking.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {room?.floor} 层 · {room?.room} 教室
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        {booking.date} · 第{booking.segment}节
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelReservation(booking.id)}
                      className="rounded-lg border border-red-300/25 px-3 py-1.5 text-xs text-red-100 hover:bg-red-400/10"
                    >
                      取消预约
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </ModalShell>
      )}

      {/* 三维数字孪生：状态直接来自可用性 API */}
      {modal === 'twin' && (
        <ModalShell
          title="三维楼宇数字孪生"
          onClose={() => setModal(null)}
          extraWide
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <CampusDigitalTwin
              rooms={allRoomStates}
              selectedRoomId={selectedTwinRoom?.id}
              onSelectRoom={setTwinRoom}
              syncedAt={availability?.generatedAt}
            />
            <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              {selectedTwinRoom ? (
                <>
                  <p className="text-[10px] tracking-[0.2em] text-white/35">
                    SELECTED SPACE
                  </p>
                  <h4 className="mt-2 text-2xl font-semibold">
                    {selectedTwinRoom.floor}F · {selectedTwinRoom.room}
                  </h4>
                  <p className="mt-1 text-xs text-white/50">
                    {selectedTwinRoom.type}
                  </p>
                  <div
                    className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
                      STATUS[selectedTwinRoom.status]?.text || 'text-white/50'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        STATUS[selectedTwinRoom.status]?.dot || 'bg-white/30'
                      }`}
                    />
                    {STATUS[selectedTwinRoom.status]?.label || '不可约'}
                  </div>
                  <dl className="mt-5 space-y-3 text-xs">
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/40">容量</dt>
                      <dd className="text-white/70">
                        {selectedTwinRoom.capacity
                          ? `${selectedTwinRoom.capacity} 人`
                          : '未配置'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/40">当前查询</dt>
                      <dd className="text-right text-white/70">
                        {selectedDate} · {currentSegment.label}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-white/40">设施</dt>
                      <dd className="mt-2 flex flex-wrap gap-1">
                        {selectedTwinRoom.facilities.map((facility) => (
                          <span
                            key={facility}
                            className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/55"
                          >
                            {facility}
                          </span>
                        ))}
                      </dd>
                    </div>
                    {selectedTwinRoom.schedule?.[segmentIdx] && (
                      <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3">
                        <dt className="text-amber-100">课程安排</dt>
                        <dd className="mt-1 text-[11px] leading-relaxed text-amber-100/65">
                          {
                            selectedTwinRoom.schedule[segmentIdx]
                              .course
                          }{' '}
                          · {selectedTwinRoom.schedule[segmentIdx].teacher}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-6 space-y-2">
                    {selectedTwinRoom.status === 'free' && (
                      <button
                        type="button"
                        onClick={() => {
                          setBookingRoom(selectedTwinRoom)
                          setModal(null)
                        }}
                        className="w-full rounded-lg bg-white py-2.5 text-xs font-semibold text-black"
                      >
                        预约该教室
                      </button>
                    )}
                    {isAdmin && selectedTwinRoom.reservable && (
                      <button
                        type="button"
                        onClick={() => openDeviceControl(selectedTwinRoom)}
                        className="w-full rounded-lg border border-cyan-300/25 bg-cyan-400/10 py-2.5 text-xs text-cyan-100"
                      >
                        打开设备中控
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                  <Boxes size={26} className="text-white/25" />
                  <p className="mt-3 text-sm text-white/55">
                    点击楼宇中的房间方块
                  </p>
                  <p className="mt-1 text-[11px] text-white/35">
                    查看课程、设施和实时可约状态
                  </p>
                </div>
              )}
            </aside>
          </div>
        </ModalShell>
      )}

      {modal === 'notifications' && (
        <NotificationCenter
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setModal(null)}
          onMarkAllRead={markAllNotificationsRead}
        />
      )}

      {/* 监控：只有配置真实视频网关时才渲染画面，否则显示数据状态 */}
      {modal === 'cameras' && (
        <ModalShell
          title="教室实时状态"
          onClose={() => setModal(null)}
          wide
        >
          {!canViewCameras ? (
            <p className="py-10 text-center text-sm text-white/55">
              预约成功后可查看对应教室状态
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(isAdmin
                ? initialRooms.filter((room) => room.reservable)
                : bookings
                    .map((booking) =>
                      initialRooms.find((room) => room.id === booking.roomId),
                    )
                    .filter(Boolean)
              ).map((room) => {
                const roomState = allRoomStates.find(
                  (item) => item.id === room.id,
                )
                return (
                  <div
                    key={room.id}
                    className="overflow-hidden rounded-xl border border-white/10 bg-black"
                  >
                    <div className="relative flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_center,#101827_0%,#05070c_80%)]">
                      {CAMERA_BASE_URL ? (
                        // Remote camera streams are intentionally rendered without
                        // the image optimizer so the browser receives the live feed.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${CAMERA_BASE_URL}${CAMERA_BASE_URL.includes('?') ? '&' : '?'}roomId=${encodeURIComponent(room.id)}`}
                          alt={`${room.room} 教室实时画面`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="px-6 text-center">
                          <VideoOff
                            size={24}
                            className="mx-auto text-white/25"
                          />
                          <p className="mt-2 text-[11px] text-white/45">
                            未配置真实视频源
                          </p>
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white/65">
                        <Radio size={9} />
                        {roomState?.status === 'free'
                          ? '空闲'
                          : roomState?.status === 'class'
                            ? '上课中'
                            : roomState?.status === 'mine'
                              ? '我的预约'
                              : '占用/停用'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-white/65">
                      <span>
                        {room.floor} 层 {room.room} · {room.type}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => openDeviceControl(room)}
                          className="rounded border border-cyan-300/20 px-2 py-1 text-[10px] text-cyan-100"
                        >
                          控制设备
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ModalShell>
      )}

      {modal === 'control' && isAdmin && controlRoom && (
        <>
          {deviceState ? (
            <DeviceControlPanel
              room={controlRoom}
              device={deviceState}
              logs={deviceLogs}
              saving={deviceSaving}
              onClose={() => setModal(null)}
              onPatch={(patch) => saveDevice({ patch }, '设备状态已写入后端')}
              onScene={(scene) =>
                saveDevice({ scene }, '场景已应用并持久化')
              }
            />
          ) : (
            <ModalShell title="设备中控" onClose={() => setModal(null)}>
              <p className="py-10 text-center text-xs text-white/45">
                正在读取后端设备状态...
              </p>
            </ModalShell>
          )}
        </>
      )}

      {modal === 'admin' && isAdmin && (
        <AdminConsole
          onClose={() => setModal(null)}
          showToast={showToast}
          onAvailabilityChanged={refreshOperationalData}
        />
      )}

      {isAdmin && (
        <>
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            aria-label="打开教室信息助手"
            aria-expanded={assistantOpen}
            aria-controls="classroom-assistant-drawer"
            className={`fixed right-0 top-1/2 z-[58] flex -translate-y-1/2 items-center gap-2 rounded-l-xl border border-r-0 border-emerald-300/20 bg-[#111722]/95 px-2.5 py-4 text-[11px] tracking-wide text-emerald-100 shadow-2xl backdrop-blur transition-all duration-300 hover:bg-emerald-400/10 ${
              assistantOpen
                ? 'pointer-events-none translate-x-3 opacity-0'
                : 'translate-x-0 opacity-100'
            }`}
            style={{ writingMode: 'vertical-rl' }}
          >
            <Bot size={13} />
            AI 助手
          </button>

          <div
            id="classroom-assistant-drawer"
            className={`fixed inset-y-0 right-0 z-[59] w-[min(92vw,390px)] border-l border-white/12 bg-[#090d14]/98 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out ${
              assistantOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <AdminAssistant
              session={session}
              active={assistantOpen}
              onClose={() => setAssistantOpen(false)}
            />
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-16 z-[60] flex max-w-xs items-start gap-2.5 rounded-xl border border-white/15 bg-black/90 px-4 py-2.5 text-xs text-white/85 shadow-2xl backdrop-blur-xl">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-200" />
          <span>{toast}</span>
        </div>
      )}
    </main>
  )
}

function ModalShell({
  title,
  onClose,
  children,
  wide = false,
  extraWide = false,
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-white/12 bg-[#0b0e16] p-5 text-white sm:rounded-2xl sm:p-6 ${
          extraWide ? 'max-w-[96rem]' : wide ? 'max-w-3xl' : 'max-w-lg'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10"
          >
            关闭
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// 统计数字卡
function StatCard({ label, value, icon: Icon, tone = 'default' }) {
  const toneClass = {
    default: 'text-white/85',
    emerald: 'text-emerald-200',
    amber: 'text-amber-200',
    muted: 'text-white/50',
  }[tone]
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-black/50 px-4 py-3 backdrop-blur-xl">
      <Icon size={18} className="shrink-0 text-white/40" />
      <div>
        <p className={`text-xl font-medium tabular-nums leading-none ${toneClass}`}>
          {value}
        </p>
        <p className="mt-1 text-[11px] tracking-wide text-white/45">{label}</p>
      </div>
    </div>
  )
}
