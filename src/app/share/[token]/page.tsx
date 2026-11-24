import type { Metadata } from 'next'
import { ShareScreen } from '@/components/screens/ShareScreen'
import { loadSharedCollection } from '@/lib/share/load'
import { isShareToken } from '@/lib/share/store'

type PageProps = { params: Promise<{ token: string }> }

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Shared collection',
    robots: { index: false, follow: false },
  }
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params
  const collection = isShareToken(token) ? await loadSharedCollection(token) : null
  if (!collection) {
    return (
      <div className="share-shell">
        <main className="page">
          <h1>This link is not available.</h1>
          <p className="share-note">The collection may have been removed, or this link has expired.</p>
        </main>
      </div>
    )
  }
  return <ShareScreen token={token} collection={collection} />
}
