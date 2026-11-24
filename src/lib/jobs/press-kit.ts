import 'server-only'
import { downloadClientFile } from '@/lib/drive/client'
import { readAssetCopy } from '@/lib/drive/tags'
import { buildZip } from '@/lib/jobs/zip'
import { embargoActive, pressText } from '@/lib/press'

export async function buildPressKit(jobId: string, folderId: string, fileId: string): Promise<string> {
  const saved = (await readAssetCopy([fileId])).get(fileId)
  if (!saved?.press.captionApproved) throw new Error('Approve the caption before packing a press kit.')
  if (!saved.press.credit) throw new Error('Add the credit before packing a press kit.')
  if (embargoActive(saved.press.embargoUntil)) throw new Error('This file is still under embargo.')
  const file = await downloadClientFile(folderId, fileId)
  const note = pressText({
    caption: saved.suggestedUse,
    credit: saved.press.credit,
    license: saved.press.license,
    embargoUntil: saved.press.embargoUntil,
  })
  const bytes = new Uint8Array(await new Response(file.body).arrayBuffer())
  return buildZip(jobId, [
    { name: safeFileName(file.name, fileId), bytes },
    { name: 'caption.txt', bytes: new TextEncoder().encode(note) },
  ])
}

function safeFileName(name: string, fileId: string): string {
  const cleaned = name.replace(/[\\/]/g, '').replace(/[\r\n"]/g, '').trim()
  return cleaned || fileId
}
