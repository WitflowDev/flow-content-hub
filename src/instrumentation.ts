export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'edge') return
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  // Loaded here so the Drive worker stays out of the edge runtime and the production build.
  const { startJobLoop } = await import('@/lib/jobs/loop')
  startJobLoop()
}
