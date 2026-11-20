export type SharedFile = {
  id: string
  title: string
  fileName: string
  type: 'Video' | 'Photography'
  description: string
}

export type SharedCollectionView = {
  title: string
  description: string
  date: string
  files: SharedFile[]
  maps: Array<{ description: string; fileIds: string[] }>
}
