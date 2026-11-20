import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { SessionKeeper } from '@/components/auth/SessionKeeper'
import { AppStateProvider } from '@/state/AppState'
import '../../styles.css'
import '../components/screens/day-landing.css'

export const metadata: Metadata = {
  title: 'Flow Content Hub',
  description: 'A private library for the photos, films and campaign files Flow creates for your brand.',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AppStateProvider>
          <SessionKeeper />
          {children}
        </AppStateProvider>
      </body>
    </html>
  )
}
