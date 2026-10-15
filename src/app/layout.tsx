import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { AppStateProvider } from '@/state/AppState'
import '../../styles.css'

export const metadata: Metadata = {
  title: 'Flow Content Hub',
  description: 'Flow Content Hub — client content delivery prototype',
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
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  )
}
