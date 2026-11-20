const TAG_LIMIT = 8
const TAG_LENGTH = 32

export function parseTags(value: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const part of value.split(/[,;\n]/)) {
    const tag = part.trim().replace(/\s+/g, ' ')
    if (!tag || tag.length > TAG_LENGTH) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
    if (tags.length === TAG_LIMIT) break
  }
  return tags
}
