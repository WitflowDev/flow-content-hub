export const SERVICE_NAMES = [
  'Social Media',
  'Video',
  'Photography',
  'Design & Branding',
  'Website',
  'Paid Media',
  'Something else',
] as const

export type ServiceName = (typeof SERVICE_NAMES)[number]

export function isServiceName(value: string): value is ServiceName {
  return (SERVICE_NAMES as readonly string[]).includes(value)
}
