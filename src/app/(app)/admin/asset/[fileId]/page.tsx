import Link from 'next/link'
import { redirect } from 'next/navigation'
import { loadAdminAsset } from '@/lib/admin/asset'

type PageProps = {
  params: Promise<{ fileId: string }>
  searchParams: Promise<{ folder?: string }>
}

export default async function AdminAssetPage({ params, searchParams }: PageProps) {
  const { fileId } = await params
  const query = await searchParams
  const folder = query.folder ?? ''
  const result = await loadAdminAsset(folder, fileId)
  if (!result.ok) {
    if (result.reason === 'auth') redirect('/login')
    return (
      <div className="page admin-asset">
        <Link href="/admin" className="link">
          Back to dashboard
        </Link>
        <h1>This asset is no longer in the library.</h1>
      </div>
    )
  }

  const video = result.asset.mimeType.startsWith('video/')
  const media = `/api/admin/files/${fileId}/${video ? 'stream' : 'preview'}?folder=${folder}`

  return (
    <div className="page admin-asset">
      <Link href="/admin" className="link">
        Back to dashboard
      </Link>
      <div className="eyebrow">{video ? 'Video' : 'Photo'}</div>
      <h1>{result.asset.title}</h1>
      <p>
        {result.asset.name}
        {result.asset.collection ? ` · ${result.asset.collection}` : ''}
      </p>
      {video ? (
        <video controls playsInline preload="metadata" src={media} aria-label={result.asset.title} />
      ) : (
        <img src={media} alt="" />
      )}
    </div>
  )
}
