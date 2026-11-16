'use client'

import { useState } from 'react'
import { BusyButton } from '@/components/feedback/BusyButton'
import { Icon } from '@/components/icons'
import { downloadDriveFiles } from '@/lib/downloadDriveFiles'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'

export function BulkBar() {
  const { selected, clearSelected } = useApp()
  const { getMedia } = useLibrary()
  const [downloading, setDownloading] = useState(false)

  async function downloadSelected() {
    if (downloading) return
    const items = [...selected].flatMap((id) => {
      const item = getMedia(id)
      return item ? [item] : []
    })
    setDownloading(true)
    downloadDriveFiles(items)
    await new Promise((resolve) => setTimeout(resolve, 700))
    setDownloading(false)
  }

  return (
    <div className="bulk-bar">
      <span>
        <b>{selected.size}</b> selected
      </span>
      <BusyButton className="btn soft" pending={downloading} pendingLabel="Downloading…" onClick={() => void downloadSelected()}>
        <Icon name="download" /> Download
      </BusyButton>
      <button type="button" className="btn ghost" onClick={clearSelected}>
        Clear
      </button>
    </div>
  )
}

export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="empty-state card">
      <div className="empty-icon">
        <Icon name="search" />
      </div>
      <h3>No content found.</h3>
      <p>Try a different search or clear the current filters.</p>
      <button type="button" className="btn soft" onClick={onClear}>
        Clear filters
      </button>
    </div>
  )
}
