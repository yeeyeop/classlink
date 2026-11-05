'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bot,
  Database,
  History,
  LoaderCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { segments } from '../data'

function toDateInput(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const QUICK_QUESTIONS = [
  '当前还有哪些空闲教室？',
  '列出当前时段的课程',
  '查看 205 教室状态',
  '哪些教室已有预约？',
]

export default function AdminAssistant(props) {
  if (props.session?.role !== 'admin') return null
  return <AdminAssistantContent {...props} />
}

function AdminAssistantContent({ onClose, active = true }) {
  const [date, setDate] = useState(() => toDateInput())
  const [segment, setSegment] = useState(1)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '可以查询教室状态、空闲教室、课程、预约和设备信息。请先选择日期与节次，再直接提问。',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [logs, setLogs] = useState([])
  const [provider, setProvider] = useState({
    mode: 'local',
    model: 'rule-based-live-data',
  })
  const [contextSummary, setContextSummary] = useState(null)
  const [executingAction, setExecutingAction] = useState(null)
  const scrollRef = useRef(null)

  const loadLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/assistant?limit=8', {
        cache: 'no-store',
      })
      const result = await response.json()
      if (response.ok) {
        setLogs(result.logs || [])
        if (result.provider) setProvider(result.provider)
      }
    } catch {
      // Assistant logs are optional for operation.
    }
  }, [])

  useEffect(() => {
    if (active) loadLogs()
  }, [active, loadLogs])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, sending])

  const sendMessage = async (value = input) => {
    const content = String(value || '').trim()
    if (!content || sending) return
    const userMessage = { role: 'user', content }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setSending(true)
    try {
      const response = await fetch('/api/admin/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          date,
          segment,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: result.error || '助手暂时不可用。',
            error: true,
          },
        ])
        return
      }
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.reply,
          provider: result.provider,
          model: result.model,
          toolsUsed: result.toolsUsed || [],
          pendingAction: result.pendingAction || null,
          warning: result.warning,
        },
      ])
      setContextSummary(result.contextSummary || null)
      setProvider({
        mode: result.provider,
        model: result.model,
      })
      await loadLogs()
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: '连接失败，请检查网络后重试。',
          error: true,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const executePendingAction = async (messageIndex, action, confirmed) => {
    if (!confirmed) {
      setMessages((current) =>
        current.map((message, index) =>
          index === messageIndex
            ? {
                ...message,
                pendingAction: null,
                content: `${message.content}\n\n已取消本次操作。`,
              }
            : message,
        ),
      )
      return
    }
    setExecutingAction(action.summary)
    try {
      const response = await fetch('/api/admin/assistant/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await response.json()
      setMessages((current) =>
        current.map((message, index) =>
          index === messageIndex
            ? {
                ...message,
                pendingAction: null,
                content: result.ok
                  ? result.message
                  : `操作失败：${result.error || '未知错误'}`,
                error: !result.ok,
              }
            : message,
        ),
      )
      await loadLogs()
    } catch {
      setMessages((current) =>
        current.map((message, index) =>
          index === messageIndex
            ? {
                ...message,
                pendingAction: null,
                content: '操作请求失败，请稍后重试。',
                error: true,
              }
            : message,
        ),
      )
    } finally {
      setExecutingAction(null)
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[#090d14]">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-200">
              <Bot size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">教室信息助手</p>
              <p className="text-[10px] text-white/35">
                基于实时预约、课程和设备数据
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[9px] text-white/45">
              <Database size={9} />
              {provider.mode === 'deepseek'
                ? 'DeepSeek'
                : provider.mode === 'external'
                  ? '外部模型'
                  : '本地规则'}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="收起教室信息助手"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/45 hover:bg-white/10 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_110px] gap-2">
          <input
            type="date"
            value={date}
            min={toDateInput()}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none [color-scheme:dark]"
          />
          <select
            value={segment}
            onChange={(event) => setSegment(Number(event.target.value))}
            className="rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-xs text-white outline-none"
          >
            {segments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[92%] rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                message.role === 'user'
                  ? 'bg-white text-black'
                  : message.error
                    ? 'border border-red-300/20 bg-red-500/10 text-red-100'
                    : 'border border-white/10 bg-white/[0.045] text-white/75'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === 'assistant' && !message.error && (
                <p className="mt-2 text-[9px] text-white/30">
                  {message.provider === 'deepseek'
                    ? `DeepSeek：${message.model}`
                    : message.provider === 'external'
                      ? `模型：${message.model}`
                      : '数据来源：当前后端实时状态'}
                  {message.toolsUsed?.length
                    ? ` · 工具：${message.toolsUsed.join('、')}`
                    : ''}
                </p>
              )}
              {message.warning && (
                <p className="mt-2 text-[9px] text-amber-200/70">
                  外部模型失败，已使用实时数据规则回答。
                </p>
              )}
              {message.pendingAction && (
                <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3">
                  <p className="text-[9px] font-medium tracking-wide text-amber-100">
                    待确认操作
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/65">
                    {message.pendingAction.summary}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      disabled={executingAction === message.pendingAction.summary}
                      onClick={() =>
                        executePendingAction(
                          index,
                          message.pendingAction,
                          true,
                        )
                      }
                      className="rounded-md bg-white px-2.5 py-1 text-[10px] font-medium text-black disabled:opacity-50"
                    >
                      {executingAction === message.pendingAction.summary
                        ? '执行中...'
                        : '确认执行'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        executePendingAction(
                          index,
                          message.pendingAction,
                          false,
                        )
                      }
                      className="rounded-md border border-white/12 px-2.5 py-1 text-[10px] text-white/55"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-[11px] text-white/35">
            <LoaderCircle size={13} className="animate-spin" />
            正在读取教室数据...
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => sendMessage(question)}
              disabled={sending}
              className="rounded-full border border-white/10 bg-white/[0.025] px-2 py-1 text-[9px] text-white/45 hover:text-white/75 disabled:opacity-40"
            >
              {question}
            </button>
          ))}
        </div>
        {contextSummary && (
          <p className="mb-2 text-[9px] text-white/30">
            空闲 {contextSummary.free} · 课程 {contextSummary.class} · 已预约{' '}
            {contextSummary.reserved}
          </p>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-black/25 p-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={2000}
            placeholder="例如：明天第 3-4 节还有哪些教室可用？"
            className="min-h-0 flex-1 resize-none bg-transparent px-1 py-1 text-xs text-white outline-none placeholder:text-white/25"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={sending || !input.trim()}
            aria-label="发送"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-black disabled:bg-white/10 disabled:text-white/25"
          >
            {sending ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] text-white/25">
          <span className="inline-flex items-center gap-1">
            <Sparkles size={9} />
            数据随时段更新
          </span>
          <span>{provider.model}</span>
        </div>
      </div>

      {logs.length > 0 && (
        <details className="border-t border-white/10 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10px] text-white/35">
            <History size={10} />
            最近查询日志
          </summary>
          <div className="mt-2 space-y-2">
            {logs.slice(0, 4).map((log) => (
              <div key={log.id} className="rounded-lg bg-white/[0.025] p-2">
                <p className="line-clamp-2 text-[10px] text-white/55">
                  {log.question}
                </p>
                <p className="mt-1 text-[9px] text-white/25">
                  {new Date(log.createdAt).toLocaleString('zh-CN')} ·{' '}
                  {log.provider}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </aside>
  )
}
