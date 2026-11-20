import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

type ServiceAccount = {
  project_id: string
  client_email: string
  private_key: string
}

function readServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Put the whole service account JSON on one line.',
    )
  }
  if (!isServiceAccount(parsed)) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields.')
  return {
    ...parsed,
    private_key: parsed.private_key.replace(/\\n/g, '\n'),
  }
}

function isServiceAccount(value: unknown): value is ServiceAccount {
  if (!value || typeof value !== 'object') return false
  const account = value as Record<string, unknown>
  return (
    typeof account.project_id === 'string' &&
    typeof account.client_email === 'string' &&
    typeof account.private_key === 'string'
  )
}

function adminApp(): App {
  const existing = getApps()[0]
  if (existing) return existing
  const account = readServiceAccount()
  return initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
    projectId: account.project_id,
  })
}

export function adminAuth(): Auth {
  return getAuth(adminApp())
}

export function adminDb(): Firestore {
  return getFirestore(adminApp())
}
