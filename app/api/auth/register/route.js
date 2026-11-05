import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import {
  createSession,
  hashPassword,
  publicUser,
} from '../../../../lib/auth'
import { mutateDb } from '../../../../lib/db'

export async function POST(request) {
  try {
    const body = await request.json()
    const name = String(body.name || '').trim()
    const sid = String(body.sid || '').trim()
    const college = String(body.college || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!name || !sid || !college || !email || !password) {
      return NextResponse.json({ error: '请完整填写注册信息' }, { status: 400 })
    }
    if (!/^\d{8,12}$/.test(sid)) {
      return NextResponse.json({ error: '学号格式不正确' }, { status: 400 })
    }
    if (!/^[^@\s]+@bupt\.cn$/i.test(email)) {
      return NextResponse.json({ error: '请使用 @bupt.cn 校园邮箱' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: '密码至少需要 8 位' }, { status: 400 })
    }

    const { salt, hash } = hashPassword(password)
    const result = await mutateDb((db) => {
      if (db.users.some((user) => user.sid === sid)) {
        return {
          value: { error: '该学号已注册，请直接登录', status: 409 },
        }
      }
      if (db.users.some((user) => user.email?.toLowerCase() === email)) {
        return {
          value: { error: '该校园邮箱已绑定其他账号', status: 409 },
        }
      }
      const user = {
        id: randomUUID(),
        name,
        sid,
        college,
        email,
        role: 'student',
        salt,
        passwordHash: hash,
        createdAt: new Date().toISOString(),
      }
      db.users.push(user)
      return { value: { user } }
    })
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      )
    }
    await createSession(result.user.id)

    return NextResponse.json({ user: publicUser(result.user) })
  } catch {
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 })
  }
}
