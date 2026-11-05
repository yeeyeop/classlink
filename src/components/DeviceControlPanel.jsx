'use client'

import {
  Fan,
  Lightbulb,
  Power,
  Thermometer,
  Wand2,
  Wind,
} from 'lucide-react'

const LIGHT_ZONES = [
  { id: 'podium', label: '讲台灯' },
  { id: 'front', label: '前照明灯' },
  { id: 'middle', label: '中照明灯' },
  { id: 'rear', label: '后照明灯' },
  { id: 'blackboard', label: '黑板灯' },
  { id: 'ambient', label: '氛围灯' },
]

const AC_MODES = [
  { id: 'cool', label: '制冷' },
  { id: 'heat', label: '制热' },
  { id: 'fan', label: '送风' },
  { id: 'dry', label: '除湿' },
]

const FAN_SPEEDS = ['低风', '中风', '高风', '自动']

const SCENES = [
  { id: 'class', label: '上课模式' },
  { id: 'study', label: '自习模式' },
  { id: 'energy', label: '节能模式' },
  { id: 'off', label: '全部关闭' },
]

export default function DeviceControlPanel({
  room,
  device,
  saving,
  onClose,
  onPatch,
  onScene,
}) {
  const patch = (group, key, value) =>
    onPatch({ [group]: { [key]: value } })

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-6">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-2xl border border-white/12 bg-[#080b12] p-5 text-white sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-cyan-200/60">
              PERSISTED IOT CONTROL
            </p>
            <h3 className="mt-1 text-xl font-semibold">
              {room.floor}F · {room.room} 设备中控
            </h3>
            <p className="mt-1 text-xs text-white/45">
              控制结果写入后端 JSON，刷新页面后保持；每次操作都有设备日志。
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

        <div className="mb-4 flex flex-wrap gap-2">
          {SCENES.map((scene) => (
            <button
              key={scene.id}
              type="button"
              disabled={saving}
              onClick={() => onScene(scene.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/18 bg-cyan-400/[0.06] px-3 py-2 text-xs text-cyan-50 hover:bg-cyan-400/10 disabled:opacity-50"
            >
              <Wand2 size={12} />
              {scene.label}
            </button>
          ))}
          {saving && (
            <span className="self-center text-[11px] text-white/40">
              正在写入后端...
            </span>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-white">
                <Wind size={16} className="text-cyan-200" />
                空调
              </span>
              <button
                type="button"
                onClick={() => patch('ac', 'on', !device.ac.on)}
                className={`rounded-full px-3 py-1 text-xs ${
                  device.ac.on
                    ? 'bg-emerald-400/15 text-emerald-200'
                    : 'bg-white/5 text-white/45'
                }`}
              >
                {device.ac.on ? '运行中' : '已关闭'}
              </button>
            </div>
            {device.ac.on && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      patch('ac', 'temp', Math.max(16, device.ac.temp - 1))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70"
                  >
                    -
                  </button>
                  <div className="text-center">
                    <p className="flex items-center justify-center gap-1 text-3xl font-light text-white">
                      {device.ac.temp}
                      <Thermometer size={15} className="text-cyan-200" />
                    </p>
                    <p className="text-[10px] text-white/45">目标温度</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      patch('ac', 'temp', Math.min(30, device.ac.temp + 1))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70"
                  >
                    +
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {AC_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => patch('ac', 'mode', mode.id)}
                      className={`rounded-lg px-1 py-1.5 text-[11px] ${
                        device.ac.mode === mode.id
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-white/55'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => patch('ac', 'swing', !device.ac.swing)}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${
                      device.ac.swing
                        ? 'border-sky-300/30 text-sky-200'
                        : 'border-white/10 text-white/45'
                    }`}
                  >
                    扫风 {device.ac.swing ? '开' : '关'}
                  </button>
                  <div className="flex items-center gap-1">
                    <Fan size={12} className="mr-1 text-white/35" />
                    {FAN_SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => patch('ac', 'fan', speed)}
                        className={`rounded-md px-2 py-1 text-[10px] ${
                          device.ac.fan === speed
                            ? 'bg-white text-black'
                            : 'bg-white/5 text-white/45'
                        }`}
                      >
                        {speed}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Lightbulb size={16} className="text-amber-200" />
              照明与投影
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LIGHT_ZONES.map((zone) => {
                const active = device.lights[zone.id]
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() =>
                      patch('lights', zone.id, !active)
                    }
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs ${
                      active
                        ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
                        : 'border-white/10 bg-white/[0.03] text-white/50'
                    }`}
                  >
                    {zone.label}
                    <span
                      className={`h-2 w-2 rounded-full ${
                        active ? 'bg-amber-300' : 'bg-white/15'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/55">投影</span>
                <button
                  type="button"
                  onClick={() =>
                    patch('projector', 'on', !device.projector.on)
                  }
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] ${
                    device.projector.on
                      ? 'bg-emerald-400/15 text-emerald-200'
                      : 'bg-white/5 text-white/45'
                  }`}
                >
                  <Power size={11} />
                  {device.projector.on ? '已开机' : '关机'}
                </button>
              </div>
              {device.projector.on && (
                <div className="mt-2 flex gap-1.5">
                  {['HDMI 1', 'HDMI 2', '无线投屏'].map((source) => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => patch('projector', 'source', source)}
                      className={`rounded-md px-2 py-1 text-[10px] ${
                        device.projector.source === source
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-white/45'
                      }`}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
        {device.updatedAt && (
          <p className="mt-3 text-right text-[10px] text-white/30">
            最近写入：{new Date(device.updatedAt).toLocaleString('zh-CN')}
          </p>
        )}
      </div>
    </div>
  )
}
