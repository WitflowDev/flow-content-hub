export function contentDisposition(filename: string, inline = false): string {
  const cleaned = filename.replace(/[\r\n\u0000-\u001F\u007F"]/g, '').trim() || 'download'
  const ascii = cleaned.replace(/[^\x20-\x7E]/g, '_').replace(/[\\;]/g, '_') || 'download'
  const kind = inline ? 'inline' : 'attachment'
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`
}
