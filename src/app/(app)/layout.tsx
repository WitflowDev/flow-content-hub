'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { Shell } from '@/components/shell/Shell'
import { isAuthed } from '@/lib/auth'

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (!isAuthed()) {
      router.replace('/login')
      return
    }
    setAllowed(true)
  }, [router])

  if (!allowed) return null
  return <Shell>{children}</Shell>
}
