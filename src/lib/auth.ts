export const AUTH_KEY = 'flow-demo-auth'
export const ONBOARDING_KEY = 'flow-onboarding-done'
export const TIP_KEY = 'flow-tip-content'

export function isAuthed(): boolean {
  return localStorage.getItem(AUTH_KEY) === '1'
}
