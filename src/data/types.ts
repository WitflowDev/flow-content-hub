export type MediaType = 'Video' | 'Photography' | 'Design'
export type MediaChannel = 'Instagram' | 'Website' | 'Ads' | 'Design'
export type Orientation = 'Vertical' | 'Portrait' | 'Landscape' | 'Square'

export type MediaItem = {
  id: string
  title: string
  type: MediaType
  file: string
  size: string
  duration?: string
  src: string
  channel: string
  tags?: string[]
  orientation: Orientation
  collection: string
  position: string
  description: string
  driveFileId?: string | null
}

export type ContentMap = {
  fileIds: string[]
  description: string
}

export type Collection = {
  slug: string
  title: string
  count: number
  date: string
  updatedAt?: string
  description: string
  tags?: string[]
  maps?: ContentMap[]
  ids: string[]
  cover: string[]
  published?: boolean
}

export type Guide = {
  id: string
  title: string
  desc: string
  gif: string
  poster: string
  duration: string
  steps: string[]
}

export const CONTENT_TYPE_FILTERS = ['All', 'Video', 'Photography', 'Design'] as const
export type ContentTypeFilter = (typeof CONTENT_TYPE_FILTERS)[number]

export type ChannelFilter = string

export const SORT_MODES = ['Newest', 'A\u2013Z'] as const
export type SortMode = (typeof SORT_MODES)[number]

export type ViewMode = 'grid' | 'list'

export type NavId = 'home' | 'content' | 'collections' | 'guides'
