import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/session'
import { readJob } from '@/lib/jobs/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ jobId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ message: 'Sign in to download.' }, { status: 401 })
  const { jobId } = await context.params
  const job = await readJob(jobId)
  if (!job || job.uid !== user.uid || (job.kind !== 'collection-zip' && job.kind !== 'press-kit')) {
    return NextResponse.json({ message: 'That download is not available.' }, { status: 404 })
  }
  switch (job.status) {
    case 'queued':
    case 'running':
      return NextResponse.json({ status: job.status }, { status: 202 })
    case 'error':
      return NextResponse.json({ message: job.error || 'The download could not be prepared.' }, { status: 404 })
    case 'done':
      return streamZip(job.filePath, job.kind === 'press-kit' ? 'press-kit.zip' : 'collection.zip')
    default: {
      const unexpected: never = job.status
      return NextResponse.json({ message: unexpected }, { status: 404 })
    }
  }
}

async function streamZip(filePath: string, filename: string): Promise<Response> {
  if (!filePath) return NextResponse.json({ message: 'That download is not available.' }, { status: 404 })
  try {
    const info = await stat(filePath)
    if (!info.isFile()) return NextResponse.json({ message: 'That download is not available.' }, { status: 404 })
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ message: 'That download is not available.' }, { status: 404 })
  }
}
