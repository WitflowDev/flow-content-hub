'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { onIdTokenChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { endSession, establishSession } from '@/lib/firebase/browser-session'
import { registerSignOutHandler } from '@/state/AppState'

const PUBLIC_PREFIXES = ['/login', '/reset-password', '/share']

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function SessionKeeper() {
  const pathname = usePathname()
  const paused = isPublicRoute(pathname)

  useEffect(() => {
    registerSignOutHandler(endSession)
    return () => {
      registerSignOutHandler(null)
    }
  }, [])

  useEffect(() => {
    if (paused) return undefined
    let lastToken = ''
    let initialized = false
    let stop = () => {}

    try {
      stop = onIdTokenChanged(auth(), (user) => {
        if (!user) {
          lastToken = ''
          initialized = true
          return
        }
        void user
          .getIdToken()
          .then((token) => {
            // On initial hydration of an already-authenticated app page, the server already
            // verified the HttpOnly session cookie — record the token without triggering a
            // duplicate POST /api/auth/session + router.refresh().
            if (!initialized) {
              initialized = true
              lastToken = token
              return
            }
            if (token === lastToken) return
            lastToken = token
            return establishSession(user).catch(() => {
              lastToken = ''
            })
          })
          .catch(() => {
            initialized = true
          })
      })
    } catch {
      return undefined
    }
    return () => {
      stop()
    }
  }, [paused])

  return null
}
