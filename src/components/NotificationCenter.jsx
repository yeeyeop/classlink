'use client'

import { Bell, CheckCheck } from 'lucide-react'

export default function NotificationCenter({
  notifications,
  unreadCount,
  onClose,
  onMarkAllRead,
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-6">
      <div className="max-h-[86vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-white/12 bg-[#080b12] p-5 text-white sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Bell size={17} />
              通知中心
            </h3>
            <p className="mt-1 text-[11px] text-white/40">
              {unreadCount > 0 ? `${unreadCount} 条未读通知` : '全部通知已读'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/10"
          >
            关闭
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/20 bg-emerald-400/[0.07] px-3 py-2 text-xs text-emerald-100"
          >
            <CheckCheck size={13} />
            全部标为已读
          </button>
        )}

        <div className="mt-4 space-y-2">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-xl border p-3 ${
                notification.readAt
                  ? 'border-white/8 bg-white/[0.025]'
                  : 'border-sky-300/18 bg-sky-400/[0.06]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white/90">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">
                    {notification.message}
                  </p>
                </div>
                {!notification.readAt && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-300" />
                )}
              </div>
              <p className="mt-2 text-[10px] text-white/30">
                {new Date(notification.createdAt).toLocaleString('zh-CN')}
              </p>
            </article>
          ))}
          {notifications.length === 0 && (
            <p className="py-14 text-center text-xs text-white/40">
              暂无通知
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
