'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CalendarDays,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserRound,
  Wifi,
  WifiOff,
  Wand2,
} from 'lucide-react'
import { initialRooms } from '../data'

function formatBookingTime(booking) {
  return `${booking.date} · 第 ${booking.segment} 节 · ${booking.duration || 1} 个节次`
}

export default function AdminConsole({
  onClose,
  showToast,
  onAvailabilityChanged,
}) {
  const [tab, setTab] = useState('bookings')
  const [users, setUsers] = useState([])
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState({})
  const [filters, setFilters] = useState({
    q: '',
    date: '',
    roomId: '',
    status: '',
  })
  const [loading, setLoading] = useState(true)
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const [usersResponse, bookingsResponse] = await Promise.all([
      fetch('/api/admin/users', { cache: 'no-store' }),
      fetch(`/api/admin/bookings?${params}`, { cache: 'no-store' }),
    ])
    if (usersResponse.ok) {
      const data = await usersResponse.json()
      setUsers(data.users || [])
    }
    if (bookingsResponse.ok) {
      const data = await bookingsResponse.json()
      setBookings(data.bookings || [])
      setStats(data.stats || {})
    }
    setLoading(false)
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    let refreshTimer
    const source = new EventSource('/api/realtime')
    source.addEventListener('connected', () => setRealtimeConnected(true))
    source.addEventListener('change', () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(loadData, 160)
    })
    source.onerror = () => setRealtimeConnected(false)
    return () => {
      window.clearTimeout(refreshTimer)
      source.close()
    }
  }, [loadData])

  const mutateBooking = async (booking, patch, successMessage) => {
    const response = await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: booking.id, ...patch }),
    })
    const result = await response.json()
    if (!response.ok) {
      showToast(result.error || '预约调整失败')
      return false
    }
    showToast(successMessage)
    await loadData()
    onAvailabilityChanged?.()
    return true
  }

  const editBooking = async (booking) => {
    const date = window.prompt('预约日期（YYYY-MM-DD）', booking.date)
    if (!date) return
    const segment = Number(
      window.prompt('起始节次（1-6）', String(booking.segment)),
    )
    if (!Number.isInteger(segment)) return
    const duration = Number(
      window.prompt('持续节次数（1-4）', String(booking.duration || 1)),
    )
    if (!Number.isInteger(duration)) return
    await mutateBooking(
      booking,
      { date, segment, duration, status: 'confirmed' },
      '预约时间已调整',
    )
  }

  const moveBooking = async (booking) => {
    const roomNo = window.prompt('目标教室号，例如 203', booking.room?.room || '')
    if (!roomNo) return
    const room = initialRooms.find(
      (item) => item.reservable && item.room === roomNo.trim(),
    )
    if (!room) {
      showToast('未找到可预约教室')
      return
    }
    await mutateBooking(
      booking,
      { roomId: room.id, status: 'confirmed' },
      `预约已调整到 ${room.room} 教室`,
    )
  }

  const cancelBooking = async (booking) => {
    if (!window.confirm(`确认取消 ${booking.user?.name || '该用户'} 的预约？`))
      return
    await mutateBooking(booking, { status: 'cancelled' }, '预约已取消')
  }

  const restoreBooking = async (booking) => {
    await mutateBooking(booking, { status: 'confirmed' }, '预约已恢复')
  }

  const sendNotice = async (userId, name) => {
    const title = window.prompt(`给 ${name} 发送通知标题`)
    if (!title) return
    const message = window.prompt(`给 ${name} 发送通知内容`)
    if (!message) return
    const response = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, message }),
    })
    const result = await response.json()
    if (!response.ok) {
      showToast(result.error || '通知发送失败')
      return
    }
    showToast(`通知已写入用户收件箱（${result.count || 1} 条）`)
  }

  const deleteUser = async (userId, name) => {
    if (!window.confirm(`确认注销账号 ${name}？该操作会移除其预约。`)) return
    const response = await fetch(
      `/api/admin/users?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    )
    const result = await response.json()
    if (!response.ok) {
      showToast(result.error || '账号注销失败')
      return
    }
    showToast('账号已注销')
    await loadData()
    onAvailabilityChanged?.()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-6">
      <div className="relative flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-t-2xl border border-white/12 bg-[#080b12] text-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-lg font-semibold">运营管理台</h3>
            <p className="mt-0.5 text-[11px] text-white/40">
              全量预约、账号、通知与教室信息助手
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] sm:inline-flex ${
                realtimeConnected
                  ? 'border-emerald-300/20 text-emerald-100'
                  : 'border-amber-300/20 text-amber-100'
              }`}
            >
              {realtimeConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {realtimeConnected ? '实时同步' : '重连中'}
            </span>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65 hover:bg-white/10"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65 hover:bg-white/10"
            >
              关闭
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3 sm:px-6">
          <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setTab('bookings')}
              className={`rounded-md px-4 py-1.5 text-xs ${
                tab === 'bookings'
                  ? 'bg-white text-black'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              预约管理
            </button>
            <button
              type="button"
              onClick={() => setTab('users')}
              className={`rounded-md px-4 py-1.5 text-xs ${
                tab === 'users'
                  ? 'bg-white text-black'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              账号管理
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full min-h-0 overflow-y-auto p-5 sm:p-6">
            {tab === 'bookings' && (
            <>
              <div className="grid gap-2 sm:grid-cols-4">
                <Metric label="累计预约" value={stats.total || 0} />
                <Metric label="有效预约" value={stats.confirmed || 0} />
                <Metric label="已取消" value={stats.cancelled || 0} />
                <Metric label="当前筛选" value={stats.filtered || 0} />
              </div>
              <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[1fr_160px_170px_130px]">
                <label className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
                  />
                  <input
                    value={filters.q}
                    onChange={(event) =>
                      setFilters((value) => ({ ...value, q: event.target.value }))
                    }
                    placeholder="搜索姓名 / 学号 / 教室"
                    className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/30"
                  />
                </label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      date: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                />
                <select
                  value={filters.roomId}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      roomId: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="">全部教室</option>
                  {initialRooms
                    .filter((room) => room.reservable)
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.floor}F · {room.room}
                      </option>
                    ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      status: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="">全部状态</option>
                  <option value="confirmed">有效</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>

              <div className="mt-4 space-y-2">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {booking.user?.name || '未知用户'}
                          <span className="ml-2 text-[10px] font-normal text-white/40">
                            {booking.user?.sid}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-white/55">
                          {booking.room?.floor}F · {booking.room?.room}{' '}
                          {booking.room?.type}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/45">
                          <CalendarDays size={11} />
                          {formatBookingTime(booking)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] ${
                          booking.status === 'cancelled'
                            ? 'bg-white/5 text-white/40'
                            : 'bg-emerald-400/10 text-emerald-100'
                        }`}
                      >
                        {booking.status === 'cancelled' ? '已取消' : '有效'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {booking.status === 'confirmed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => editBooking(booking)}
                            className="rounded border border-amber-300/20 px-2 py-1 text-[10px] text-amber-100"
                          >
                            调整时间
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBooking(booking)}
                            className="rounded border border-sky-300/20 px-2 py-1 text-[10px] text-sky-100"
                          >
                            调整教室
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelBooking(booking)}
                            className="rounded border border-red-300/20 px-2 py-1 text-[10px] text-red-100"
                          >
                            取消预约
                          </button>
                        </>
                      )}
                      {booking.status === 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => restoreBooking(booking)}
                          className="rounded border border-emerald-300/20 px-2 py-1 text-[10px] text-emerald-100"
                        >
                          恢复预约
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!loading && bookings.length === 0 && (
                  <p className="py-12 text-center text-xs text-white/40">
                    当前筛选条件下没有预约
                  </p>
                )}
              </div>
            </>
            )}

            {tab === 'users' && (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-white/55">
                        <UserRound size={15} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {user.name}
                          <span className="ml-2 rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-normal text-white/50">
                            {user.role === 'admin' ? '管理员' : '学生'}
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] text-white/45">
                          {user.sid} · {user.college}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/35">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-white/40">
                      {user.bookingCount} 条预约记录
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => sendNotice(user.id, user.name)}
                      className="inline-flex items-center gap-1 rounded border border-sky-300/20 px-2 py-1 text-[10px] text-sky-100"
                    >
                      <Send size={10} />
                      发送通知
                    </button>
                    {user.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => deleteUser(user.id, user.name)}
                        className="inline-flex items-center gap-1 rounded border border-red-300/20 px-2 py-1 text-[10px] text-red-100"
                      >
                        <Trash2 size={10} />
                        注销账号
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-3 text-[10px] text-white/35 sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <Wand2 size={11} />
            每次调整都会重新执行服务端冲突校验，并刷新实时可用性和 3D 状态。
          </span>
        </div>

      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xl font-medium tabular-nums text-white">{value}</p>
      <p className="mt-1 text-[10px] tracking-wide text-white/40">{label}</p>
    </div>
  )
}
