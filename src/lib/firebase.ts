import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, inMemoryPersistence, initializeAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { readFirebaseWebConfig } from '@/lib/firebase/config'

const CLIENT_APP = 'flow-client'

function firebaseApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === CLIENT_APP)
  if (existing) return existing
  return initializeApp(readFirebaseWebConfig(), CLIENT_APP)
}

let authSingleton: Auth | undefined
let dbSingleton: Firestore | undefined

export function auth(): Auth {
  if (authSingleton) return authSingleton
  const app = firebaseApp()
  const persistence = typeof window === 'undefined' ? inMemoryPersistence : browserLocalPersistence
  try {
    authSingleton = initializeAuth(app, { persistence })
  } catch {
    authSingleton = getAuth(app)
  }
  return authSingleton
}

export function db(): Firestore {
  dbSingleton ??= getFirestore(firebaseApp())
  return dbSingleton
}
