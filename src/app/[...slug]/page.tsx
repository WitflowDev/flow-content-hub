import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/session'

export default async function UnknownPage() {
  const user = await getSessionUser()
  redirect(user ? '/home' : '/login')
}
