import 'server-only'
import { syncLibraryFolder } from '@/lib/drive/library'
import { reportError } from '@/lib/observe'
import { claimJob, completeJob, failJob, type JobRecord } from '@/lib/jobs/queue'
import { warmFolderThumbnails } from '@/lib/jobs/warm'
import { buildPressKit } from '@/lib/jobs/press-kit'
import { buildCollectionZip } from '@/lib/jobs/zip'

let started = false
let draining = false

export function startJobLoop(): void {
  if (started) return
  started = true
  setInterval(() => {
    void drainOne()
  }, 2000)
}

async function drainOne(): Promise<void> {
  if (draining) return
  draining = true
  let job: JobRecord | null = null
  try {
    job = await claimJob()
    if (!job) return
    const filePath = await runJob(job)
    await completeJob(job.id, filePath)
  } catch (error) {
    reportError('jobs', error)
    if (job) await failJob(job.id, job.attempts, error).catch((failure: unknown) => reportError('jobs', failure))
  } finally {
    draining = false
  }
}

async function runJob(job: JobRecord): Promise<string> {
  switch (job.kind) {
    case 'sync-library':
      await syncLibraryFolder(job.folderId)
      await warmFolderThumbnails(job.folderId, job.uid)
      return ''
    case 'warm-thumbnails':
      await warmFolderThumbnails(job.folderId, job.uid)
      return ''
    case 'collection-zip':
      return buildCollectionZip(job.id, job.folderId, job.fileIds)
    case 'press-kit':
      return buildPressKit(job.id, job.folderId, job.fileIds[0] ?? '')
    default: {
      const unexpected: never = job.kind
      throw new Error(`Unknown job ${unexpected}`)
    }
  }
}
