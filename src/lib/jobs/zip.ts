import 'server-only'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Zip, ZipPassThrough } from 'fflate'
import { downloadClientFile } from '@/lib/drive/client'

const MAX_ZIP_BYTES = 200 * 1024 * 1024

export async function buildCollectionZip(jobId: string, folderId: string, fileIds: readonly string[]): Promise<string> {
  let used = 0
  const entries: { name: string; bytes: Uint8Array }[] = []
  const names = new Set<string>()
  for (const fileId of fileIds) {
    const file = await downloadClientFile(folderId, fileId)
    const bytes = new Uint8Array(await new Response(file.body).arrayBuffer())
    used += bytes.byteLength
    if (used > MAX_ZIP_BYTES) throw new Error('That collection is too large to pack.')
    entries.push({ name: uniqueName(file.name, fileId, names), bytes })
  }
  return buildZip(jobId, entries)
}

export async function buildZip(jobId: string, entries: readonly { name: string; bytes: Uint8Array }[]): Promise<string> {
  const directory = join(tmpdir(), 'flow-zips')
  await mkdir(directory, { recursive: true })
  const filePath = join(directory, `${jobId}.zip`)
  const output = createWriteStream(filePath)
  const zip = new Zip()
  const finished = new Promise<void>((resolve, reject) => {
    output.on('error', reject)
    zip.ondata = (error, data, final) => {
      if (error) {
        reject(error)
        return
      }
      if (data.length > 0) output.write(data)
      if (final) output.end(() => resolve())
    }
  })
  let used = 0
  for (const entry of entries) {
    used += entry.bytes.byteLength
    if (used > MAX_ZIP_BYTES) throw new Error('That collection is too large to pack.')
    const file = new ZipPassThrough(entry.name)
    zip.add(file)
    file.push(entry.bytes, true)
  }
  zip.end()
  await finished
  return filePath
}

function uniqueName(name: string, fileId: string, used: Set<string>): string {
  const cleaned = name.replace(/[\\/]/g, '').replace(/[\r\n"]/g, '').trim() || fileId
  if (!used.has(cleaned)) {
    used.add(cleaned)
    return cleaned
  }
  const dot = cleaned.lastIndexOf('.')
  const next = dot > 0 ? `${cleaned.slice(0, dot)}-${fileId}${cleaned.slice(dot)}` : `${cleaned}-${fileId}`
  used.add(next)
  return next
}
