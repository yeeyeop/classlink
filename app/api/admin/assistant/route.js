import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSessionUser } from '../../../../lib/auth'
import { getDb, mutateDb } from '../../../../lib/db'
import {
  buildAdminAssistantContext,
  generateAdminAssistantReply,
  getAssistantProvider,
} from '../../../../lib/admin-assistant'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function normalizeMessages(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (message) =>
        ['user', 'assistant'].includes(message?.role) &&
        typeof message?.content === 'string' &&
        message.content.trim(),
    )
    .slice(-20)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }))
}

async function requireAdmin() {
  const admin = await getSessionUser()
  return admin?.role === 'admin' ? admin : null
}

export async function GET(request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }
  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get('limit')) || 8, 1),
    50,
  )
  const db = await getDb()
  const logs = (db.assistantLogs || [])
    .filter((item) => item.userId === admin.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
  return NextResponse.json({ logs, provider: getAssistantProvider() })
}

export async function POST(request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const messages = normalizeMessages(body.messages)
    const date = String(body.date || '')
    const segment = Number(body.segment)
    if (!messages.length || messages.at(-1)?.role !== 'user') {
      return NextResponse.json(
        { error: '最后一条消息必须是管理员提问' },
        { status: 400 },
      )
    }
    if (!DATE_PATTERN.test(date) || !Number.isInteger(segment) || segment < 1 || segment > 6) {
      return NextResponse.json(
        { error: 'date 和 1-6 的 segment 是必填查询条件' },
        { status: 400 },
      )
    }

    const db = await getDb()
    const context = buildAdminAssistantContext(db, date, segment, admin)
    const answer = await generateAdminAssistantReply({ messages, context })
    const createdAt = new Date().toISOString()

    await mutateDb((currentDb) => {
      currentDb.assistantLogs.push({
        id: randomUUID(),
        userId: admin.id,
        date,
        segment,
        question: messages.at(-1).content.slice(0, 2000),
        reply: answer.reply.slice(0, 4000),
        provider: answer.provider,
        model: answer.model,
        toolsUsed: answer.toolsUsed || [],
        warning: answer.warning || null,
        createdAt,
      })
      if (currentDb.assistantLogs.length > 200) {
        currentDb.assistantLogs = currentDb.assistantLogs.slice(-200)
      }
      return { realtime: false }
    })

    return NextResponse.json({
      reply: answer.reply,
      provider: answer.provider,
      model: answer.model,
      toolsUsed: answer.toolsUsed || [],
      pendingAction: answer.pendingAction || null,
      warning: answer.warning || null,
      contextSummary: context.summary,
      generatedAt: createdAt,
    })
  } catch (error) {
    console.error('POST /api/admin/assistant failed:', error)
    return NextResponse.json({ error: '管理员助手暂时不可用' }, { status: 500 })
  }
}
