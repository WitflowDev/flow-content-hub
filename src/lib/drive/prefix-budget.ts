export const VIDEO_PREFIX_RATIO = 0.2
export const VIDEO_PREFIX_CAP = 8 * 1024 * 1024

export function videoPrefixLength(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0
  const share = Math.floor(bytes * VIDEO_PREFIX_RATIO)
  return Math.min(Math.max(share, 1), VIDEO_PREFIX_CAP, bytes)
}

export function streamPath(thumbnailSrc: string, fileId: string, warm = false): string {
  const version = new URL(thumbnailSrc, 'https://flow.local').searchParams.get('v') ?? ''
  const params = new URLSearchParams()
  if (version) params.set('v', version)
  if (warm) params.set('warm', '1')
  const query = params.toString()
  const base = `/api/drive/files/${fileId}/stream`
  return query ? `${base}?${query}` : base
}
