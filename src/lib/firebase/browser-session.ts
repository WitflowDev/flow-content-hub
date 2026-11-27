import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

let generation = 0
let inFlight: Promise<void> | null = null

export function whenSignedIn(): Promise<User> {
  const existing = auth().currentUser
  if (existing) return Promise.resolve(existing)
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth(), (user) => {
      stop()
      if (user) resolve(user)
      else reject(new Error('Not signed in'))
    })
  })
}

export function establishSession(user: User): Promise<void> {
  if (inFlight) return inFlight
  const current = generation
  inFlight = writeSession(user, current).finally(() => {
    inFlight = null
  })
  return inFlight
}

async function writeSession(user: User, current: number): Promise<void> {
  const idToken = await user.getIdToken()
  if (current !== generation) return
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (current !== generation) {
    await clearSessionCookie()
    return
  }
  if (!response.ok) throw new Error('The session could not be saved.')
}

export async function endSession(): Promise<void> {
  generation += 1
  const pending = inFlight
  inFlight = null
  try {
    await signOut(auth())
  } catch {
    // Always clear the server session cookie even if Firebase client signOut fails.
  }
  await pending?.catch(() => undefined)
  await clearSessionCookie().catch(() => undefined)
}

async function clearSessionCookie(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE' })
}
