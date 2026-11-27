'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const DELAYS_MS = [4000, 6000, 9000, 14000, 20000]
const MAX_POLLS = 20

export function LibraryRefresh({ active }: { active: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return undefined
    let attempts = 0
    let timer: number | undefined

    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer)
        timer = undefined
      }
    }

    const schedule = () => {
      clearTimer()
      if (document.hidden || attempts >= MAX_POLLS) return
      const delay = DELAYS_MS[Math.min(attempts, DELAYS_MS.length - 1)] ?? 20000
      timer = window.setTimeout(() => {
        attempts += 1
        router.refresh()
        schedule()
      }, delay)
    }

    const onVisibility = () => {
      if (document.hidden) {
        clearTimer()
      } else if (attempts < MAX_POLLS) {
        attempts += 1
        router.refresh()
        schedule()
      }
    }

    schedule()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimer()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, router])

  return null
}
