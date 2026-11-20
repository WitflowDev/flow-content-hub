import { LoginScreen } from '@/components/screens/LoginScreen'

type LoginPageProps = {
  searchParams: Promise<{ mode?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  return <LoginScreen initialMode={params.mode === 'signup' ? 'signup' : 'login'} />
}
