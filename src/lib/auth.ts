export const TIP_KEY = 'flow-tip-content'

export type AppRole = 'client' | 'admin'

export function roleFromAppMetadata(metadata: object | null | undefined): AppRole {
  if (!metadata || !('role' in metadata)) return 'client'
  return metadata.role === 'admin' ? 'admin' : 'client'
}
