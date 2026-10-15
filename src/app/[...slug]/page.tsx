'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthed } from '@/lib/auth'

export default function UnknownPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace(isAuthed() ? '/home' : '/login')
  }, [router])

  return null
}
