import { useState } from 'react'
import Image from 'next/image'
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  MapPin,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react'
import VideoBackdrop from './VideoBackdrop'
import { building, colleges } from '../data'

const modes = [
  { id: 'register', label: '注册', icon: UserPlus },
  { id: 'login', label: '登录', icon: LogIn },
  { id: 'recover', label: '找回密码', icon: KeyRound },
]

function Input({ icon: Icon, label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-white/70">
        {label}
      </span>
      <div className="relative">
        <Icon
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45"
        />
        <input
          {...props}
          className="w-full rounded-lg border border-white/15 bg-white/[0.06] py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/45 focus:bg-white/[0.09]"
        />
      </div>
    </label>
  )
}

export default function AuthView({
  initialMode,
  onBack,
  onRegistered,
}) {
  const [mode, setMode] = useState(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)
  const [registerForm, setRegisterForm] = useState({
    name: '',
    sid: '',
    college: colleges[0],
    email: '',
    password: '',
    confirm: '',
    agree: false,
  })
  const [loginForm, setLoginForm] = useState({ sid: '', password: '' })
  const [recoverForm, setRecoverForm] = useState({ sid: '', email: '' })
  const [resetForm, setResetForm] = useState({
    token: '',
    password: '',
    confirm: '',
  })
  const [recoverStep, setRecoverStep] = useState('request')

  const updateRegister = (key) => (event) =>
    setRegisterForm((form) => ({ ...form, [key]: event.target.value }))

  const switchMode = (next) => {
    setMode(next)
    if (next !== 'recover') setRecoverStep('request')
    setError(null)
    setNotice(null)
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    const form = registerForm
    if (!form.name.trim() || !form.sid.trim()) {
      setError('请填写姓名与学号/校园卡号')
      return
    }
    if (!/^\d{8,12}$/.test(form.sid.trim())) {
      setError('学号格式不正确，请输入 8-12 位数字')
      return
    }
    if (!/^[^@\s]+@bupt\.cn$/i.test(form.email.trim())) {
      setError('请输入以 @bupt.cn 结尾的校园邮箱')
      return
    }
    if (form.password.length < 8) {
      setError('密码至少需要 8 位')
      return
    }
    if (form.password !== form.confirm) {
      setError('两次输入的密码不一致')
      return
    }
    if (!form.agree) {
      setError('请先同意校园用户使用协议')
      return
    }
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || '注册失败，请稍后重试')
      return
    }
    onRegistered(result.user)
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || '登录失败，请稍后重试')
      return
    }
    onRegistered(result.user)
  }

  const handleRecover = async (event) => {
    event.preventDefault()
    if (!recoverForm.sid.trim() || !recoverForm.email.trim()) {
      setError('请填写学号与校园邮箱')
      return
    }
    setError(null)
    const response = await fetch('/api/auth/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recoverForm),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || '发送重置信息失败')
      return
    }
    setNotice(
      result.resetToken
        ? '开发环境已生成重置令牌，请在下方继续设置新密码。'
        : '重置令牌已通过校园邮件通道发送，请在 30 分钟内完成。',
    )
    setResetForm((form) => ({
      ...form,
      token: result.resetToken || form.token,
    }))
    setRecoverStep('reset')
  }

  const handleReset = async (event) => {
    event.preventDefault()
    if (!resetForm.token.trim()) {
      setError('请输入重置令牌')
      return
    }
    if (resetForm.password.length < 8) {
      setError('密码至少需要 8 位')
      return
    }
    if (resetForm.password !== resetForm.confirm) {
      setError('两次输入的密码不一致')
      return
    }
    const response = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resetForm),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || '密码重置失败')
      return
    }
    setError(null)
    setNotice('密码已更新，请使用新密码登录。')
    setRecoverStep('done')
  }

  const formTitle = {
    register: '创建校园账号',
    login: '欢迎回来',
    recover: '找回登录密码',
  }
  const formDescription = {
    register: '完成注册后，即可查询并预约专享楼的空余教室。',
    login: '登录后可继续管理你的教室预约与使用记录。',
    recover: '使用注册时的校园邮箱重置密码。',
  }

  return (
    <section className="relative min-h-screen w-full bg-black font-song text-white lg:overflow-hidden">
      <VideoBackdrop className="object-[62%_center] opacity-60 lg:opacity-100" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-black/90 lg:hidden" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.95)_32%,rgba(0,0,0,0.82)_52%,rgba(0,0,0,0.35)_74%,rgba(0,0,0,0.05)_100%)] lg:block" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px]">
        <div className="flex min-h-screen w-full flex-col px-6 py-6 sm:px-10 lg:w-[64%] lg:px-14 xl:px-20">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2.5 text-left"
            >
              <Image
                src="/bupt-logo.png"
                alt="北京邮电大学校徽"
                width={160}
                height={64}
                className="h-12 w-auto sm:h-16"
                style={{ width: 'auto' }}
              />
            </button>
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-white"
            >
              <ArrowLeft size={14} />
              返回首页
            </button>
          </div>

          <div className="flex flex-1 items-center py-8 sm:py-12">
            <div
              key={mode}
              className="w-full max-w-[560px] animate-[fadeSlideUp_0.55s_ease_both]"
            >
              <div className="mb-8 flex w-fit rounded-xl border border-white/10 bg-white/[0.06] p-1 backdrop-blur">
                {modes.map((item) => {
                  const active = mode === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => switchMode(item.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                        active
                          ? 'bg-white text-black'
                          : 'text-white/65 hover:text-white'
                      }`}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {formTitle[mode]}
              </h2>
              <p className="mb-7 mt-2 text-sm leading-relaxed text-white/60">
                {formDescription[mode]}
              </p>

              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      icon={User}
                      label="姓名"
                      placeholder="你的真实姓名"
                      value={registerForm.name}
                      onChange={updateRegister('name')}
                      autoComplete="name"
                    />
                    <Input
                      icon={ShieldCheck}
                      label="学号 / 校园卡号"
                      placeholder="例如 2024990101"
                      value={registerForm.sid}
                      onChange={updateRegister('sid')}
                      inputMode="numeric"
                      autoComplete="username"
                    />
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium tracking-wide text-white/70">
                      学院
                    </span>
                    <div className="relative">
                      <Building2
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45"
                      />
                      <select
                        value={registerForm.college}
                        onChange={updateRegister('college')}
                        className="w-full appearance-none rounded-lg border border-white/15 bg-white/[0.06] py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-white/45 [&>option]:bg-neutral-900"
                      >
                        {colleges.map((college) => (
                          <option key={college} value={college}>
                            {college}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <Input
                    icon={Mail}
                    label="校园邮箱"
                    placeholder="name@bupt.cn"
                    type="email"
                    value={registerForm.email}
                    onChange={updateRegister('email')}
                    autoComplete="email"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium tracking-wide text-white/70">
                        设置密码
                      </span>
                      <div className="relative">
                        <Lock
                          size={16}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45"
                        />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="至少 8 位"
                          value={registerForm.password}
                          onChange={updateRegister('password')}
                          className="w-full rounded-lg border border-white/15 bg-white/[0.06] py-3 pl-11 pr-11 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/45"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? '隐藏密码' : '显示密码'}
                          onClick={() => setShowPassword((visible) => !visible)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </label>
                    <Input
                      icon={Lock}
                      label="确认密码"
                      placeholder="再次输入密码"
                      type={showPassword ? 'text' : 'password'}
                      value={registerForm.confirm}
                      onChange={updateRegister('confirm')}
                      autoComplete="new-password"
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      checked={registerForm.agree}
                      onChange={(event) =>
                        setRegisterForm((form) => ({
                          ...form,
                          agree: event.target.checked,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 accent-white"
                    />
                    <span className="text-xs leading-relaxed text-white/55">
                      我已阅读并同意《北京邮电大学校园空间使用协议》及《空教室预约管理办法》
                    </span>
                  </label>

                  {(error || notice) && (
                    <Alert tone={error ? 'error' : 'success'} message={error || notice} />
                  )}

                  <button
                    type="submit"
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.99]"
                  >
                    <UserPlus size={16} />
                    注册并进入平台
                  </button>
                </form>
              )}

              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    icon={ShieldCheck}
                    label="学号 / 校园卡号"
                    placeholder="请输入学号"
                    value={loginForm.sid}
                    onChange={(event) =>
                      setLoginForm((form) => ({
                        ...form,
                        sid: event.target.value,
                      }))
                    }
                    autoComplete="username"
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium tracking-wide text-white/70">
                      密码
                    </span>
                    <div className="relative">
                      <Lock
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45"
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={loginForm.password}
                        onChange={(event) =>
                          setLoginForm((form) => ({
                            ...form,
                            password: event.target.value,
                          }))
                        }
                        autoComplete="current-password"
                        className="w-full rounded-lg border border-white/15 bg-white/[0.06] py-3 pl-11 pr-11 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/45"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </label>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => switchMode('recover')}
                      className="text-white/55 transition-colors hover:text-white"
                    >
                      忘记密码？
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="font-medium text-white/85 transition-colors hover:text-white"
                    >
                      还没有账号？立即注册
                    </button>
                  </div>

                  {(error || notice) && (
                    <Alert tone={error ? 'error' : 'success'} message={error || notice} />
                  )}

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.99]"
                  >
                    <LogIn size={16} />
                    登录并进入平台
                  </button>
                </form>
              )}

              {mode === 'recover' && recoverStep === 'request' && (
                <form onSubmit={handleRecover} className="space-y-4">
                  <Input
                    icon={ShieldCheck}
                    label="学号 / 校园卡号"
                    placeholder="请输入注册学号"
                    value={recoverForm.sid}
                    onChange={(event) =>
                      setRecoverForm((form) => ({
                        ...form,
                        sid: event.target.value,
                      }))
                    }
                  />
                  <Input
                    icon={Mail}
                    label="校园邮箱"
                    placeholder="name@bupt.cn"
                    type="email"
                    value={recoverForm.email}
                    onChange={(event) =>
                      setRecoverForm((form) => ({
                        ...form,
                        email: event.target.value,
                      }))
                    }
                  />

                  {(error || notice) && (
                    <Alert tone={error ? 'error' : 'success'} message={error || notice} />
                  )}

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.99]"
                  >
                    <Mail size={16} />
                    发送重置链接
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="w-full text-center text-xs text-white/55 transition-colors hover:text-white"
                  >
                    想起密码了？返回登录
                  </button>
                </form>
              )}

              {mode === 'recover' && recoverStep === 'reset' && (
                <form onSubmit={handleReset} className="space-y-4">
                  <Input
                    icon={KeyRound}
                    label="重置令牌"
                    placeholder="粘贴邮件中的重置令牌"
                    value={resetForm.token}
                    onChange={(event) =>
                      setResetForm((form) => ({
                        ...form,
                        token: event.target.value,
                      }))
                    }
                  />
                  <Input
                    icon={Lock}
                    label="新密码"
                    placeholder="至少 8 位"
                    type="password"
                    value={resetForm.password}
                    onChange={(event) =>
                      setResetForm((form) => ({
                        ...form,
                        password: event.target.value,
                      }))
                    }
                  />
                  <Input
                    icon={Lock}
                    label="确认新密码"
                    placeholder="再次输入新密码"
                    type="password"
                    value={resetForm.confirm}
                    onChange={(event) =>
                      setResetForm((form) => ({
                        ...form,
                        confirm: event.target.value,
                      }))
                    }
                  />
                  {(error || notice) && (
                    <Alert tone={error ? 'error' : 'success'} message={error || notice} />
                  )}
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-black"
                  >
                    <KeyRound size={16} />
                    确认重置密码
                  </button>
                </form>
              )}

              {mode === 'recover' && recoverStep === 'done' && (
                <div className="space-y-4">
                  {(error || notice) && (
                    <Alert tone={error ? 'error' : 'success'} message={error || notice} />
                  )}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-black"
                  >
                    <LogIn size={16} />
                    返回登录
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-white/40">
            <span>仅供北京邮电大学在校师生使用</span>
            <span>v1.0 · {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-[36%] flex-col items-end justify-between p-14 text-right lg:flex">
        <span className="flex items-center gap-2 text-xs tracking-[0.25em] text-white/70">
          <MapPin size={13} />
          {building.campus} · 陵水黎族自治县
        </span>
        <div className="max-w-md">
          <p className="mb-3 text-4xl font-semibold leading-tight tracking-tight">
            北京邮电大学
            <br />
            {building.campus}{building.name}
          </p>
          <p className="text-sm leading-relaxed text-white/65">
            每一间教室的安排都清晰可见 空闲时段即刻锁定 教学 自习与社团活动 共用一个聪明的时间表
          </p>
          <div className="mt-6 flex items-center justify-end gap-2 text-xs text-white/80">
            <CheckCircle2 size={14} className="text-emerald-200" />
            今日数据已同步
          </div>
        </div>
      </div>
    </section>
  )
}

function Alert({ tone, message }) {
  const styles =
    tone === 'error'
      ? 'border-red-300/25 bg-red-500/10 text-red-100'
      : 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed ${styles}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {tone === 'error' ? (
        <span className="mt-px shrink-0">!</span>
      ) : (
        <Check size={14} className="mt-px shrink-0" />
      )}
      {message}
    </div>
  )
}
