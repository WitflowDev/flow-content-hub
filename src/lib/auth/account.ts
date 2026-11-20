'use server'

import { adminDb } from '@/lib/firebase/admin'
import { getSessionUser } from '@/lib/firebase/session'

export async function accountEntryPath(): Promise<'/home' | '/onboarding'> {
  const user = await getSessionUser()
  if (!user) return '/onboarding'
  const profile = await adminDb().collection('users').doc(user.uid).get()
  return profile.get('onboardingDone') === true ? '/home' : '/onboarding'
}

export async function saveAccountName(name: string): Promise<boolean> {
  const user = await getSessionUser()
  const nextName = name.trim()
  if (!user || !nextName) return false
  try {
    await adminDb().collection('users').doc(user.uid).update({ name: nextName })
    return true
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'The profile could not be saved.')
    return false
  }
}

export async function setOnboardingDone(done: boolean): Promise<boolean> {
  const user = await getSessionUser()
  if (!user) return false
  try {
    await adminDb().collection('users').doc(user.uid).set({ onboardingDone: done }, { merge: true })
    return true
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Onboarding could not be saved.')
    return false
  }
}
