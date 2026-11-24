import type { FlowLogo, InterfaceTheme } from '@/lib/interface-theme'
import type { ThemePalette } from '@/lib/theme-palette'

export type AdminAccount = {
  id: string
  label: string
  hasFolder: boolean
  role: 'client' | 'admin'
}

export type AdminUser = {
  id: string
  email: string
  name: string
  companyName: string
  role: 'client' | 'admin'
  hasFolder: boolean
  interfaceTheme: InterfaceTheme
  flowLogo: FlowLogo | null
  logoFileId: string | null
  bannerFileId: string | null
  themeColors: Partial<ThemePalette>
}

export type AdminCollectionRow = {
  id: string
  title: string
  count: number
  published: boolean
  accountId: string
  accountLabel: string
  clientFolderId: string
  coverFileId: string | null
  coverVideo: boolean
  description: string
  tags: string[]
}

export type AdminPost = {
  id: string
  title: string
  description: string
  tags: string[]
  video: boolean
  credit: string
  license: '' | 'free' | 'credit'
  captionApproved: boolean
  embargoUntil: string
}

export type AdminContentMap = {
  fileIds: string[]
  description: string
}

export type AdminCollectionDetail = {
  id: string
  title: string
  description: string
  tags: string[]
  coverFileId: string
  posts: AdminPost[]
  maps: AdminContentMap[]
}

export type ServiceRequestStatus = 'new' | 'open' | 'done'

export type ServiceRequestRow = {
  id: string
  service: string
  message: string
  phone: string
  assetTitle: string
  assetHref: string
  person: string
  meta: string
  status: ServiceRequestStatus
}

export function isServiceRequestStatus(value: string): value is ServiceRequestStatus {
  switch (value) {
    case 'new':
    case 'open':
    case 'done':
      return true
    default:
      return false
  }
}
