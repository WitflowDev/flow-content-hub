'use client'

import { useEffect } from 'react'
import { onIdTokenChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { establishSession } from '@/lib/firebase/browser-session'

export function SessionKeeper() {
  useEffect(() => {
    let timeout = 0
    let stop = () => {}
    try {
      stop = onIdTokenChanged(auth(), (user) => {
        window.clearTimeout(timeout)
        if (!user) return
        // Wait until sign-in finishes. Reading the token inside this callback rejects that promise.
        timeout = window.setTimeout(() => {
          void establishSession(user).catch(() => {
            // The next navigation sends the user back to login when the cookie is missing.
          })
        }, 0)
      })
    } catch {
      return undefined
    }
    return () => {
      window.clearTimeout(timeout)
      stop()
    }
  }, [])

  return null
}
