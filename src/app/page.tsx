import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingScreen } from '@/components/screens/LandingScreen'
import { readUserProfile } from '@/lib/firebase/profile'
import { getSessionUser } from '@/lib/firebase/session'

export const metadata: Metadata = {
  title: 'Flow Content Hub',
  description: 'A private library for the photos, films and campaign files Flow creates for your brand.',
}

export default async function IndexPage() {
  const user = await getSessionUser()
  if (!user) return <LandingScreen />

  const profile = await readUserProfile(user.uid)
  redirect(profile?.onboardingDone ? '/home' : '/onboarding')
}
