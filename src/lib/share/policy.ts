import { isDriveFileId } from '@/lib/drive/ids'

export const SHARE_PRESET_DAYS = [3, 7, 14, 31] as const
export const SHARE_MIN_DAYS = 1
export const SHARE_MAX_DAYS = 62

const DAY_MS = 24 * 60 * 60 * 1000
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export type SharePresetDays = (typeof SHARE_PRESET_DAYS)[number]
export type ShareSpan = SharePresetDays | 'custom'

export function isShareToken(value: string): boolean {
  return TOKEN_PATTERN.test(value)
}

export function parseShareDays(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < SHARE_MIN_DAYS || value > SHARE_MAX_DAYS) return null
  return value
}

export function shareExpiresAtMs(days: number, nowMs: number): number {
  return nowMs + days * DAY_MS
}

export function shareLifetimeLabel(days: number): string {
  return days === 1 ? '1 day' : `${days} days`
}

export function resolveSharedFolder(input: {
  token: string
  shareFolderId: unknown
  collectionToken: unknown
  published: unknown
  expiresAtMs: number | null
  nowMs: number
}): string | null {
  if (!isShareToken(input.token)) return null
  if (typeof input.shareFolderId !== 'string' || !isDriveFileId(input.shareFolderId)) return null
  if (input.collectionToken !== input.token) return null
  if (input.published === false) return null
  if (input.expiresAtMs !== null && !(input.expiresAtMs > input.nowMs)) return null
  return input.shareFolderId
}
