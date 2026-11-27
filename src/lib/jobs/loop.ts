import 'server-only'
import { syncLibraryFolder } from '@/lib/drive/library'
import { reportError } from '@/lib/observe'
import { claimJob, claimSpecificJob, completeJob, enqueueJob, failJob, requeueJob, type JobRecord } from '@/lib/jobs/queue'
import { warmFolderThumbnails } from '@/lib/jobs/warm'
import { buildPressKit } from '@/lib/jobs/press-kit'
import { buildCollectionZip } from '@/lib/jobs/zip'

let started = false
let draining = false

export function startJobLoop(): void {
  if (started) return
  // On Vercel serverless, background work is executed via Next.js after() rather than setInterval.
  if (process.env.VERCEL === '1') return
  started = true
  setInterval(() => {
    void drainOne()
  }, 4000)
}

export async function drainJob(jobId?: string): Promise<void> {
  if (jobId) {
    let job: JobRecord | null = null
    try {
      job = await claimSpecificJob(jobId)
      if (!job) return
      await executeClaimedJob(job)
    } catch (error) {
      reportError('jobs', error)
      if (job) await failJob(job.id, job.attempts, error).catch((failure: unknown) => reportError('jobs', failure))
    }
    return
  }
  await drainOne()
}

async function drainOne(): Promise<void> {
  if (draining) return
  draining = true
  let job: JobRecord | null = null
  try {
    job = await claimJob()
    if (!job) return
    await executeClaimedJob(job)
  } catch (error) {
    reportError('jobs', error)
    if (job) await failJob(job.id, job.attempts, error).catch((failure: unknown) => reportError('jobs', failure))
  } finally {
    draining = false
  }
}

async function executeClaimedJob(job: JobRecord): Promise<void> {
  const outcome = await runJob(job)
  if (outcome.requeue) {
    await requeueJob(job.id, 1000)
    return
  }
  await completeJob(job.id, outcome.filePath)
}

async function runJob(job: JobRecord): Promise<{ filePath: string; requeue?: boolean }> {
  switch (job.kind) {
    case 'sync-library': {
      await syncLibraryFolder(job.folderId)
      const warmed = await warmFolderThumbnails(job.folderId)
      if (warmed.more) {
        await enqueueJob({ kind: 'warm-thumbnails', folderId: job.folderId, uid: job.uid })
      }
      return { filePath: '' }
    }
    case 'warm-thumbnails': {
      const warmed = await warmFolderThumbnails(job.folderId)
      return { filePath: '', requeue: warmed.more }
    }
    case 'collection-zip':
      return { filePath: await buildCollectionZip(job.id, job.folderId, job.fileIds) }
    case 'press-kit':
      return { filePath: await buildPressKit(job.id, job.folderId, job.fileIds[0] ?? '') }
    default: {
      const unexpected: never = job.kind
      throw new Error(`Unknown job ${unexpected}`)
    }
  }
}
