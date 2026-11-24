export function isDriveFileId(fileId: string): boolean {
  return /^[a-zA-Z0-9_-]{10,}$/.test(fileId)
}
