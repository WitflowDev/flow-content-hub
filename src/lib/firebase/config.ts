export type FirebaseWebConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

export function readFirebaseWebConfig(): FirebaseWebConfig {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error(
      'Missing NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, or NEXT_PUBLIC_FIREBASE_APP_ID',
    )
  }
  return { apiKey, authDomain, projectId, appId }
}

export const SESSION_COOKIE = 'flow_session'

export const FLOW_UID_HEADER = 'x-flow-uid'
export const FLOW_EMAIL_HEADER = 'x-flow-email'

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}
