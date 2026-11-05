import { useState } from 'react'
import Image from 'next/image'
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  MapPin,
  Menu,
  X,
} from 'lucide-react'
import VideoBackdrop from './VideoBackdrop'
import { building } from '../data'

function GuidePanel({ className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-white/15 bg-black/85 p-5 text-left shadow-2xl backdrop-blur-xl ${className}`}
    >
      <p className="mb-2 text-sm font-semibold text-white">
        专享楼A座空教室预约平台
      </p>
      <p className="mb-4 text-xs leading-relaxed text-white/70">
        用于查看专享楼A座各楼层智慧教室与研讨室的使用状态，并在线预约当前空闲的教室。
      </p>
      <p className="mb-2 text-xs font-medium text-white/85">使用方法</p>
      <ol className="space-y-2 text-xs leading-relaxed text-white/65">
        <li>1. 使用 @bupt.cn 校园邮箱注册并登录</li>
        <li>2. 选择楼层与时段，查看上课、空闲或未投入状态</li>
        <li>3. 勾选“仅显示当前时间可用教室”快速筛选</li>
        <li>4. 在空闲教室点击预约，并到“我的预约”查看或取消</li>
      </ol>
    </div>
  )
}

export default function HomeView({ onRegister, onLogin }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black font-song text-white">
      <VideoBackdrop />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/45" />

      <nav className="relative z-30 flex items-center justify-between px-6 py-5 md:px-12 lg:px-16">
        <div className="flex items-center gap-10">
          <button
            type="button"
            className="flex items-center text-left"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Image
              src="/bupt-logo.png"
              alt="北京邮电大学校徽"
              width={160}
              height={64}
              priority
              className="h-12 w-auto sm:h-16"
              style={{ width: 'auto' }}
            />
          </button>

          <div
            className="relative hidden md:block"
            onMouseEnter={() => setGuideOpen(true)}
            onMouseLeave={() => setGuideOpen(false)}
          >
            <button
              type="button"
              onClick={() => setGuideOpen((open) => !open)}
              className="flex items-center gap-2 text-lg text-white/75 transition-colors hover:text-white"
            >
              使用指南
              <ChevronDown
                size={17}
                className={`transition-transform duration-300 ${
                  guideOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {guideOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-3 w-[360px] -translate-x-1/2">
                <GuidePanel />
              </div>
            )}
          </div>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <button
            type="button"
            onClick={onLogin}
            className="rounded-lg border border-white/20 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            登录
          </button>
        </div>

        <button
          type="button"
          aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="relative flex h-10 w-10 items-center justify-center active:scale-90 md:hidden"
        >
          <Menu
            size={24}
            strokeWidth={1.6}
            className={`absolute text-white transition-all duration-300 ${
              mobileMenuOpen
                ? 'rotate-90 scale-50 opacity-0'
                : 'rotate-0 scale-100 opacity-100'
            }`}
          />
          <X
            size={24}
            strokeWidth={1.6}
            className={`absolute text-white transition-all duration-300 ${
              mobileMenuOpen
                ? 'rotate-0 scale-100 opacity-100'
                : '-rotate-90 scale-50 opacity-0'
            }`}
          />
        </button>
      </nav>

      <div
        className={`absolute inset-x-0 top-0 z-20 overflow-hidden bg-black/95 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileMenuOpen
            ? 'visible h-screen opacity-100'
            : 'invisible pointer-events-none h-0 opacity-0'
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className={`flex h-full flex-col justify-center px-12 pb-20 transition-all duration-500 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            mobileMenuOpen
              ? 'translate-y-0 opacity-100'
              : 'translate-y-8 opacity-0'
          }`}
        >
          <p className="mb-5 text-xs tracking-[0.25em] text-white/55">
            {building.university} · {building.campus}
          </p>
          <button
            type="button"
            onClick={() => setGuideOpen((open) => !open)}
            className="flex items-center gap-3 py-4 text-left text-4xl font-medium text-white/75 transition-colors hover:text-white"
          >
            使用指南
            <ChevronDown
              size={26}
              className={`transition-transform duration-300 ${
                guideOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {guideOpen && (
            <GuidePanel className="mt-3 max-w-[520px] p-5 text-left" />
          )}
          {!guideOpen && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onRegister()
                }}
                className="mt-6 w-fit rounded-full bg-white px-8 py-3.5 text-base font-medium text-black"
              >
                确认，进入注册
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onLogin()
                }}
                className="mt-4 w-fit text-sm text-white/70"
              >
                已有账号？去登录
              </button>
            </>
          )}
        </div>
      </div>

      <section className="relative z-10 flex h-[calc(100vh-80px)] items-center justify-center px-6 pb-24 text-center sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-5xl translate-y-4 sm:translate-y-8 lg:translate-y-10">
          <h1
            className="text-4xl font-medium leading-none tracking-[0.3em] text-white/85 sm:text-7xl sm:tracking-[0.3em] lg:text-8xl lg:tracking-[0.32em]"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            CLASSLINK
          </h1>
          <h2
            className="mt-7 animate-[fadeSlideUp_0.8s_ease_0.3s_both] text-lg font-normal leading-relaxed tracking-[0.25em] text-white/65 sm:text-2xl md:text-3xl"
            style={{
              fontFamily:
                '"Noto Serif SC", STSong, SimSun, "Songti SC", serif',
            }}
          >
            让所有空教室
            <br />
            都能被找到
            <br />
            也能被使用
          </h2>
          <div className="mt-7 flex animate-[fadeSlideUp_0.8s_ease_0.7s_both] flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onRegister}
              className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-105 sm:px-7 sm:py-3.5"
            >
              确认，进入注册
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </div>
      </section>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-white/10 px-6 py-3 text-[11px] tracking-wide text-white/45 md:px-12 lg:px-16">
        <span className="hidden items-center gap-1.5 sm:flex">
          <MapPin size={12} />
          {building.address}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock size={12} />
          开放时间 08:00 - 22:00
        </span>
      </div>
    </main>
  )
}
