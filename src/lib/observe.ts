type MetricName = 'drive.list.ms' | 'auth.rejected' | 'library.index.hit' | 'library.index.miss'

type MetricStat = {
  count: number
  total: number
}

const metrics = new Map<MetricName, MetricStat>()

export type MetricReading = {
  name: MetricName
  count: number
  total: number
}

export function recordMetric(name: MetricName, value = 1): void {
  const current = metrics.get(name) ?? { count: 0, total: 0 }
  current.count += 1
  current.total += value
  metrics.set(name, current)
}

export function readMetrics(): MetricReading[] {
  return [...metrics.entries()].map(([name, stat]) => ({ name, count: stat.count, total: stat.total }))
}

export function reportError(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ scope, message, at: new Date().toISOString() }))
  const dsn = process.env.SENTRY_DSN?.trim()
  if (!dsn) return
  void sendSentry(dsn, scope, message)
}

function sendSentry(dsn: string, scope: string, message: string): Promise<void> {
  let store = ''
  let key = ''
  try {
    const parsed = new URL(dsn)
    key = parsed.username
    const project = parsed.pathname.replaceAll('/', '')
    if (!key || !project) return Promise.resolve()
    store = `${parsed.protocol}//${parsed.host}/api/${project}/store/?sentry_version=7&sentry_key=${encodeURIComponent(key)}`
  } catch {
    return Promise.resolve()
  }
  return fetch(store, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `${scope}: ${message}`,
      level: 'error',
      platform: 'node',
    }),
  }).then(() => undefined, () => undefined)
}
