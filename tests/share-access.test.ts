import { expect, test } from 'vitest'
import { parseShareDays, resolveSharedFolder } from '@/lib/share/policy'

const token = 'a'.repeat(43)
const otherToken = 'b'.repeat(43)
const folderId = 'folder1234567890'
const nowMs = 1_700_000_000_000

test('readShare keeps a folder only when the token, publication and expiry all match', () => {
  expect(
    resolveSharedFolder({
      token,
      shareFolderId: folderId,
      collectionToken: token,
      published: true,
      expiresAtMs: nowMs + 1_000,
      nowMs,
    }),
  ).toBe(folderId)

  expect(
    resolveSharedFolder({
      token,
      shareFolderId: folderId,
      collectionToken: otherToken,
      published: true,
      expiresAtMs: nowMs + 1_000,
      nowMs,
    }),
  ).toBeNull()

  expect(
    resolveSharedFolder({
      token,
      shareFolderId: 'other-folder-123456',
      collectionToken: token,
      published: true,
      expiresAtMs: nowMs + 1_000,
      nowMs,
    }),
  ).toBe('other-folder-123456')

  expect(
    resolveSharedFolder({
      token,
      shareFolderId: folderId,
      collectionToken: token,
      published: true,
      expiresAtMs: nowMs,
      nowMs,
    }),
  ).toBeNull()

  expect(
    resolveSharedFolder({
      token,
      shareFolderId: folderId,
      collectionToken: token,
      published: false,
      expiresAtMs: nowMs + 1_000,
      nowMs,
    }),
  ).toBeNull()

  expect(
    resolveSharedFolder({
      token,
      shareFolderId: folderId,
      collectionToken: token,
      published: true,
      expiresAtMs: null,
      nowMs,
    }),
  ).toBe(folderId)

  expect(parseShareDays(3)).toBe(3)
  expect(parseShareDays(7)).toBe(7)
  expect(parseShareDays(14)).toBe(14)
  expect(parseShareDays(31)).toBe(31)
  expect(parseShareDays(62)).toBe(62)
  expect(parseShareDays(63)).toBeNull()
  expect(parseShareDays(1.5)).toBeNull()
})
