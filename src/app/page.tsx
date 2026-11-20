import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingScreen } from '@/components/screens/LandingScreen'
import { getSessionUser } from '@/lib/firebase/session'

export const metadata: Metadata = {
  title: 'Flow Content Day and Content Hub',
  description: 'A monthly Content Day with video, photography and social posts, organised in the Flow Content Hub.',
}

export default async function IndexPage() {
  const user = await getSessionUser()
  if (!user) return <LandingScreen />

  redirect('/home')
}
