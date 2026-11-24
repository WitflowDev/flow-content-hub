export const PRESS_LICENSES = ['free', 'credit'] as const

export type PressLicense = (typeof PRESS_LICENSES)[number]

export type PressRecord = {
  credit: string
  license: PressLicense | ''
  captionApproved: boolean
  embargoUntil: string
}

export function emptyPress(): PressRecord {
  return { credit: '', license: '', captionApproved: false, embargoUntil: '' }
}

export function readPressLicense(value: unknown): PressLicense | '' {
  switch (value) {
    case 'free':
    case 'credit':
      return value
    default:
      return ''
  }
}

export function readPress(value: {
  credit: unknown
  license: unknown
  captionApproved: unknown
  embargoUntil: unknown
}): PressRecord {
  return {
    credit: cleanCredit(value.credit),
    license: readPressLicense(value.license),
    captionApproved: value.captionApproved === true,
    embargoUntil: readEmbargoDate(value.embargoUntil),
  }
}

export function pressLabel(license: PressLicense | ''): string {
  switch (license) {
    case 'free':
      return 'Free to use'
    case 'credit':
      return 'Credit required'
    case '':
      return 'License not set'
    default: {
      const unexpected: never = license
      return unexpected
    }
  }
}

export function embargoActive(until: string, now = new Date()): boolean {
  const date = readEmbargoDate(until)
  if (!date) return false
  return date > todayKey(now)
}

export function pressText(input: { caption: string; credit: string; license: PressLicense | ''; embargoUntil: string }): string {
  const lines = [input.caption.trim()]
  if (input.credit.trim()) lines.push(`Credit: ${input.credit.trim()}`)
  if (input.license) lines.push(`License: ${pressLabel(input.license)}`)
  if (input.embargoUntil) lines.push(`Embargo until: ${input.embargoUntil}`)
  return lines.filter((line) => line.length > 0).join('\n')
}

export function suggestFormat(width: number | undefined, height: number | undefined): 'instagram-post' | 'story' | 'facebook-banner' {
  if (!width || !height) return 'instagram-post'
  const ratio = width / height
  if (ratio >= 2) return 'facebook-banner'
  if (ratio <= 0.85) return 'story'
  return 'instagram-post'
}

export function suggestFromArchive(input: {
  title: string
  collection: string
  width?: number
  height?: number
  approved: readonly { caption: string; credit: string; license: PressLicense | '' }[]
}): { caption: string; credit: string; license: PressLicense | ''; format: 'instagram-post' | 'story' | 'facebook-banner' } {
  const ranked = [...input.approved].sort(
    (left, right) => overlap(input, right.caption) - overlap(input, left.caption),
  )
  const best = ranked[0]
  const credit = mostCommon(input.approved.map((item) => item.credit.trim()).filter((item) => item.length > 0))
  const license = mostCommon(input.approved.map((item) => item.license).filter((item) => item !== ''))
  return {
    caption: best && overlap(input, best.caption) > 0 ? best.caption : titleCaption(input.title),
    credit,
    license: license === 'free' || license === 'credit' ? license : '',
    format: suggestFormat(input.width, input.height),
  }
}

function overlap(input: { title: string; collection: string }, caption: string): number {
  const words = new Set(tokens(`${input.title} ${input.collection}`))
  if (words.size === 0) return 0
  let shared = 0
  for (const word of tokens(caption)) {
    if (words.has(word)) shared += 1
  }
  return shared
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2)
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  let best = ''
  let score = 0
  for (const [value, count] of counts) {
    if (count > score) {
      best = value
      score = count
    }
  }
  return best
}

function titleCaption(title: string): string {
  const cleaned = title.replaceAll('_', ' ').trim()
  return cleaned || ''
}

function cleanCredit(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 160)
}

function readEmbargoDate(value: unknown): string {
  if (typeof value !== 'string') return ''
  const date = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ''
  return date
}

function todayKey(now: Date): string {
  return now.toISOString().slice(0, 10)
}
