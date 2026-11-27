import { NextRequest, NextResponse } from 'next/server'
import { afterEach, expect, test, vi } from 'vitest'
import { FLOW_EMAIL_HEADER, FLOW_UID_HEADER } from '@/lib/firebase/config'
import { proxy } from '@/proxy'

afterEach(() => {
  vi.restoreAllMocks()
})

test('a request without a session is refused and a forged user header is ignored', async () => {
  const blocked = await proxy(
    new NextRequest('http://localhost/collections', {
      headers: { [FLOW_UID_HEADER]: 'attacker', [FLOW_EMAIL_HEADER]: 'attacker@example.com' },
    }),
  )
  expect(blocked.status).toBe(307)
  expect(blocked.headers.get('location')).toBe('http://localhost/login')

  const forwarded = vi.spyOn(NextResponse, 'next')
  await proxy(
    new NextRequest('http://localhost/', {
      headers: { [FLOW_UID_HEADER]: 'attacker', [FLOW_EMAIL_HEADER]: 'attacker@example.com' },
    }),
  )
  const headers = forwarded.mock.calls[0]?.[0]?.request?.headers
  expect(headers?.get(FLOW_UID_HEADER)).toBeNull()
  expect(headers?.get(FLOW_EMAIL_HEADER)).toBeNull()

  const apiBlocked = await proxy(
    new NextRequest('http://localhost/api/admin/uploads', {
      method: 'POST',
      headers: { [FLOW_UID_HEADER]: 'attacker', [FLOW_EMAIL_HEADER]: 'attacker@example.com' },
    }),
  )
  expect(apiBlocked.status).toBe(401)
})
