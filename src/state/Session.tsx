'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { AppRole } from '@/lib/auth'
import type { FlowLogo, InterfaceTheme } from '@/lib/interface-theme'
import type { ThemePalette } from '@/lib/theme-palette'

export type SessionProfile = {
  id: string
  name: string
  email: string
  companyName: string
  role: AppRole
  onboardingDone: boolean
  interfaceTheme: InterfaceTheme
  flowLogo: FlowLogo
  logoFileId: string | null
  bannerFileId: string | null
  palette: ThemePalette
  preview: boolean
}

const SessionContext = createContext<SessionProfile | null>(null)

export function SessionProvider({ profile, children }: { profile: SessionProfile; children: ReactNode }) {
  return <SessionContext.Provider value={profile}>{children}</SessionContext.Provider>
}

export function useSession(): SessionProfile {
  const profile = useContext(SessionContext)
  if (!profile) throw new Error('useSession must be used within SessionProvider')
  return profile
}
