import 'server-only'
import { readShare } from '@/lib/share/store'

export async function sharedFolderId(token: string): Promise<string | null> {
  const share = await readShare(token)
  return share?.folderId ?? null
}

export function contentDisposition(filename: string, inline: boolean): string {
  const cleaned = filename.replace(/[\r\n"]/g, '')
  const kind = inline ? 'inline' : 'attachment'
  return `${kind}; filename="${cleaned}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`
}
