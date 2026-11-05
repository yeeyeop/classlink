import { createHash, randomBytes } from 'crypto'

const RESET_TTL_MS = 30 * 60 * 1000

export function createResetToken() {
  const token = randomBytes(24).toString('hex')
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: Date.now() + RESET_TTL_MS,
  }
}

export function hashResetToken(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}

export function validateResetToken(record, token) {
  if (!record || record.usedAt) return false
  if (Number(record.expiresAt) < Date.now()) return false
  return record.tokenHash === hashResetToken(token)
}

export async function deliverResetToken({ email, token }) {
  const webhook = process.env.PASSWORD_RESET_WEBHOOK_URL
  if (!webhook) {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_RESET_TOKEN_RESPONSE !== 'true'
    ) {
      throw new Error('未配置 PASSWORD_RESET_WEBHOOK_URL，暂时无法发送重置邮件')
    }
    return { mode: 'development' }
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: email,
      token,
      expiresInMinutes: 30,
      appName: 'CLASSLINK 专享楼预约平台',
    }),
  })
  if (!response.ok) throw new Error('密码重置通知投递失败')
  return { mode: 'webhook' }
}
