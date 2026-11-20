import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

const TICKET_TTL_MS = 20 * 60 * 1000

type UploadTicket = {
  uploadUrl: string
  mimeType: string
  size: number
  adminUid: string
  accountId: string
  tags: string[]
  suggestedUse: string
  exp: number
}

export function sealUploadTicket(input: {
  uploadUrl: string
  mimeType: string
  size: number
  adminUid: string
  accountId: string
  tags: string[]
  suggestedUse: string
}): string {
  const ticket: UploadTicket = { ...input, exp: Date.now() + TICKET_TTL_MS }
  const body = Buffer.from(JSON.stringify(ticket)).toString('base64url')
  const signature = createHmac('sha256', ticketSecret()).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function openUploadTicket(token: string, adminUid: string): UploadTicket | null {
  const splitAt = token.lastIndexOf('.')
  if (splitAt <= 0) return null
  const body = token.slice(0, splitAt)
  const signature = token.slice(splitAt + 1)
  const expected = createHmac('sha256', ticketSecret()).update(body).digest('base64url')
  if (!safeEqual(signature, expected)) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!isTicket(parsed)) return null
  if (parsed.adminUid !== adminUid || parsed.exp <= Date.now()) return null
  if (!parsed.uploadUrl.startsWith('https://www.googleapis.com/upload/drive/')) return null
  return parsed
}

function ticketSecret(): string {
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!secret) throw new Error('Google Drive owner access is not configured.')
  return secret
}

function isTicket(value: unknown): value is UploadTicket {
  if (!value || typeof value !== 'object') return false
  const ticket = value as Record<string, unknown>
  return (
    typeof ticket.uploadUrl === 'string' &&
    typeof ticket.mimeType === 'string' &&
    typeof ticket.size === 'number' &&
    Number.isSafeInteger(ticket.size) &&
    typeof ticket.adminUid === 'string' &&
    typeof ticket.accountId === 'string' &&
    Array.isArray(ticket.tags) &&
    ticket.tags.every((tag) => typeof tag === 'string') &&
    typeof ticket.suggestedUse === 'string' &&
    ticket.suggestedUse.length <= 500 &&
    typeof ticket.exp === 'number'
  )
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
