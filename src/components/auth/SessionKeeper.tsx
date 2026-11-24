'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onIdTokenChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { establishSession } from '@/lib/firebase/browser-session'

export function SessionKeeper() {
  const router = useRouter()
  useEffect(() => {
    let timeout = 0
    let signedInUid = ''
    let stop = () => {}
    try {
      stop = onIdTokenChanged(auth(), (user) => {
        window.clearTimeout(timeout)
        if (!user) {
          signedInUid = ''
          return
        }
        if (user.uid === signedInUid) return
        const uid = user.uid
        timeout = window.setTimeout(() => {
          void establishSession(user)
            .then(() => {
              signedInUid = uid
              router.refresh()
            })
            .catch(() => {
              signedInUid = ''
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
  }, [router])

  return null
}
