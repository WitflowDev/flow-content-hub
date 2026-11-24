'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminUsers } from '@/components/admin/AdminUsers'
import { blankPhoto, PhotoRail, readCustomSize, type PhotoDraft, type ReadyCustomSize } from '@/components/admin/PhotoFormats'
import { Icon } from '@/components/icons'
import { CENTER_CROP, customFormatId, EXPORT_FORMATS, renderCrop, variantFileName, type ExportId } from '@/data/exports'
import { AdminCollectionBoard } from '@/components/screens/AdminCollectionBoard'
import { UploadMaps, type DraftMap } from '@/components/screens/UploadMaps'
import { confirmContentDay } from '@/lib/admin/content-day'
import { deleteAdminCollection, nextStandardNames, saveCollectionMaps, setCollectionCover } from '@/lib/admin/content'
import { setCollectionPublished, setRequestStatus } from '@/lib/admin/actions'
import { contentDayPlans, formatContentDay, parseDateKey, type ContentDayRequest } from '@/lib/content-day'
import type { AdminAccount, AdminCollectionRow, ServiceRequestRow, ServiceRequestStatus } from '@/lib/admin/types'
import { isServiceRequestStatus } from '@/lib/admin/types'
import { sendPromotion } from '@/lib/notifications/actions'
import { useApp } from '@/state/AppState'

const PREVIEW_COUNT = 4

type RequestFilter = 'all' | ServiceRequestStatus

const REQUEST_FILTERS: Array<{ id: RequestFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
]

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="stat-card card">
      <span>{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </div>
  )
}

export function AdminScreen({
  clientCount,
  publishedAssets,
  draftCollections,
  openRequests,
  accounts,
  collections,
  requests,
  contentDays,
}: {
  clientCount: number
  publishedAssets: number
  draftCollections: number
  openRequests: number
  accounts: AdminAccount[]
  collections: AdminCollectionRow[]
  requests: ServiceRequestRow[]
  contentDays: ContentDayRequest[]
}) {
  const { toast } = useApp()
  const router = useRouter()
  const uploadClients = accounts.filter((account) => account.role === 'client' && account.hasFolder)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [opened, setOpened] = useState<AdminCollectionRow | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [clientId, setClientId] = useState('all')
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('all')
  const [savingRequest, setSavingRequest] = useState('')
  const [confirmingDay, setConfirmingDay] = useState('')
  const clientCollections = clientId === 'all' ? collections : collections.filter((collection) => collection.accountId === clientId)
  const visibleCollections = showAll ? clientCollections : clientCollections.slice(0, PREVIEW_COUNT)
  const visibleRequests = requestFilter === 'all' ? requests : requests.filter((request) => request.status === requestFilter)
  const clients = accounts.filter((account) => account.role === 'client')

  async function onStatus(id: string, status: string) {
    if (!isServiceRequestStatus(status) || savingRequest) return
    setSavingRequest(id)
    const result = await setRequestStatus({ id, status })
    setSavingRequest('')
    if (!result.ok) {
      toast(result.message)
      return
    }
    router.refresh()
  }

  async function onConfirmDay(id: string) {
    if (confirmingDay) return
    setConfirmingDay(id)
    const result = await confirmContentDay({ id })
    setConfirmingDay('')
    if (!result.ok) {
      toast(result.message)
      return
    }
    toast('Content Day added to the calendar', 'success')
    router.refresh()
  }

  async function onPublished(row: AdminCollectionRow, published: boolean) {
    const result = await setCollectionPublished({ accountId: row.accountId, folderId: row.id, published })
    if (!result.ok) {
      toast(result.message)
      return
    }
    toast(published ? 'Collection published' : 'Collection moved to draft', 'success')
    router.refresh()
  }

  async function onDeleteCollection(row: AdminCollectionRow) {
    const result = await deleteAdminCollection({ accountId: row.accountId, folderId: row.id })
    if (!result.ok) {
      toast(result.message)
      return
    }
    toast('Collection deleted', 'success')
    router.refresh()
  }

  return (
    <div className="page admin-page">
      <header className="page-head">
        <div className="page-title">
          <div className="eyebrow">Flow Admin</div>
          <h1>Content operations</h1>
          <p>Upload files into a client folder on Google Drive, then publish the collection when it is ready.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => setUploadOpen(true)}>
          <Icon name="upload" /> Upload assets
        </button>
      </header>
      {opened ? <AdminCollectionBoard collection={opened} onBack={() => setOpened(null)} /> : null}
      {opened ? null : (
      <>
      <div className="admin-stats">
        <StatCard label="Active clients" value={String(clientCount)} sub="Profiles" />
        <StatCard label="Published assets" value={String(publishedAssets)} sub="Live in the library" />
        <StatCard label="Open requests" value={String(openRequests)} sub="Talk to Flow" />
        <StatCard label="Draft collections" value={String(draftCollections)} sub="Awaiting publish" />
      </div>
      <PromotionPanel accounts={accounts} />
      <section className="card admin-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">Content Day</div>
            <h2>Dates waiting for confirmation</h2>
          </div>
        </div>
        {contentDays.length === 0 ? <p className="admin-empty">No Content Day requests yet.</p> : null}
        {contentDays.map((day) => {
          const date = parseDateKey(day.date)
          return (
            <div className="request-row day-request" key={day.id}>
              <div>
                <b>{day.company}</b>
                <small>
                  {date ? formatContentDay(date) : day.date} · {contentDayPlans[day.plan].name} · {day.name} · {day.email}
                </small>
              </div>
              <button type="button" className="btn primary" disabled={confirmingDay === day.id} onClick={() => void onConfirmDay(day.id)}>
                {confirmingDay === day.id ? 'Confirming' : 'Confirm'}
              </button>
            </div>
          )
        })}
      </section>
      <div className="admin-layout">
        <section className="card admin-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Recent projects</div>
              <h2>Client collections</h2>
            </div>
            <div className="panel-tools">
              <select
                className="sort-select"
                aria-label="Filter collections by client"
                value={clientId}
                onChange={(event) => {
                  setClientId(event.target.value)
                  setShowAll(false)
                }}
              >
                <option value="all">All clients</option>
                {clients.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label}
                  </option>
                ))}
              </select>
              {clientCollections.length > PREVIEW_COUNT ? (
                <button type="button" className="link" onClick={() => setShowAll((current) => !current)}>
                  {showAll ? 'Show less' : 'View all'}
                </button>
              ) : null}
            </div>
          </div>
          {visibleCollections.length === 0 ? (
            <p className="admin-empty">{clientId === 'all' ? 'No collections in client folders yet.' : 'No collections for this client.'}</p>
          ) : null}
          {visibleCollections.map((collection) => (
            <div
              className="admin-row"
              key={collection.id}
              role="button"
              tabIndex={0}
              onClick={() => setOpened(collection)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setOpened(collection)
                }
              }}
            >
              <div className="admin-thumb">
                {collection.coverFileId ? (
                  <img
                    src={`/api/admin/files/${collection.coverFileId}/thumbnail?folder=${collection.clientFolderId}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </div>
              <div>
                <b>{collection.title}</b>
                <small>
                  {collection.accountLabel} · {collection.count} assets
                </small>
              </div>
              <span className={collection.published ? 'status published' : 'status'}>{collection.published ? 'Published' : 'Draft'}</span>
              <CollectionMenu
                collection={collection}
                onPublished={(published) => onPublished(collection, published)}
                onDelete={() => onDeleteCollection(collection)}
              />
            </div>
          ))}
        </section>
        <section className="card admin-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Service requests</div>
              <h2>Talk to Flow</h2>
            </div>
          </div>
          <div className="admin-filters" role="group" aria-label="Filter requests by status">
            {REQUEST_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={requestFilter === filter.id ? 'active' : undefined}
                aria-pressed={requestFilter === filter.id}
                onClick={() => setRequestFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          {requests.length === 0 ? <p className="admin-empty">No service requests yet.</p> : null}
          {requests.length > 0 && visibleRequests.length === 0 ? (
            <p className="admin-empty">No {requestFilter} requests.</p>
          ) : null}
          {visibleRequests.map((request) => (
            <div className="request-row" key={request.id}>
              <span className="request-avatar">{request.person}</span>
              <div>
                <b>{request.service}</b>
                <small className="request-copy">{request.message}</small>
                {request.assetHref ? (
                  <Link className="request-asset" href={request.assetHref}>
                    {request.assetTitle || 'Open asset'}
                  </Link>
                ) : null}
                {request.phone ? <small>{request.phone}</small> : null}
                <small>{request.meta}</small>
              </div>
              <select
                className={`status ${request.status}`}
                aria-label={`Status for ${request.service}`}
                value={request.status}
                disabled={savingRequest === request.id}
                onChange={(event) => void onStatus(request.id, event.target.value)}
              >
                <option value="new">New</option>
                <option value="open">Open</option>
                <option value="done">Done</option>
              </select>
            </div>
          ))}
        </section>
      </div>
      <AdminUsers />
      </>
      )}
      {uploadOpen ? (
        <UploadDialog
          accounts={uploadClients}
          collections={collections}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false)
            toast('Assets saved to Drive', 'success')
            router.refresh()
          }}
        />
      ) : null}
    </div>
  )
}

function PromotionPanel({ accounts }: { accounts: AdminAccount[] }) {
  const { toast } = useApp()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')
  const [sending, setSending] = useState(false)

  async function onSendPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    const result = await sendPromotion({ title, message, audience })
    setSending(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    setTitle('')
    setMessage('')
    setAudience('all')
    toast('Promotion sent', 'success')
  }

  return (
    <section className="card admin-panel promotion-panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Promotion</div>
          <h2>Send a notice</h2>
        </div>
      </div>
      <form className="promotion-form" onSubmit={(event) => void onSendPromotion(event)}>
        <div className="field">
          <label htmlFor="promotion-title">Title</label>
          <input id="promotion-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="promotion-message">Message</label>
          <textarea id="promotion-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} />
        </div>
        <div className="field">
          <label htmlFor="promotion-audience">Account</label>
          <select id="promotion-audience" value={audience} onChange={(event) => setAudience(event.target.value)}>
            <option value="all">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn primary" disabled={sending}>
          Send
        </button>
      </form>
    </section>
  )
}

function CoverChoices({
  items,
  selected,
  disabled,
  onSelect,
}: {
  items: Array<{ key: string; label: string; url: string; video: boolean }>
  selected: number
  disabled: boolean
  onSelect: (index: number) => void
}) {
  if (items.length === 0) return null
  const current = selected >= 0 && selected < items.length ? selected : 0
  return (
    <div className="field">
      <label>Banner</label>
      <div className="cover-choices">
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className={index === current ? 'cover-choice on' : 'cover-choice'}
            disabled={disabled}
            aria-pressed={index === current}
            onClick={() => onSelect(index)}
          >
            {item.video ? <video src={item.url} muted /> : <img src={item.url} alt="" />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <p className="field-note">Shown across the top of the collection in Showroom. You can change it later.</p>
    </div>
  )
}

function UploadDialog({
  accounts,
  collections,
  onClose,
  onUploaded,
}: {
  accounts: AdminAccount[]
  collections: AdminCollectionRow[]
  onClose: () => void
  onUploaded: () => void
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [destination, setDestination] = useState('')
  const [collectionName, setCollectionName] = useState('')
  const [collectionDescription, setCollectionDescription] = useState('')
  const [tags, setTags] = useState('')
  const [suggestedUse, setSuggestedUse] = useState('')
  const [useMode, setUseMode] = useState<'shared' | 'each'>('shared')
  const [fileUses, setFileUses] = useState<string[]>([])
  const [standardNames, setStandardNames] = useState(false)
  const [picked, setPicked] = useState<File[]>([])
  const [maps, setMaps] = useState<DraftMap[]>([])
  const [formatMode, setFormatMode] = useState<'single' | 'several'>('single')
  const [severalMode, setSeveralMode] = useState<'ready' | 'make'>('ready')
  const [photos, setPhotos] = useState<PhotoDraft[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [coverPreviews, setCoverPreviews] = useState<Array<{ url: string; video: boolean }>>([])
  const photosRef = useRef<PhotoDraft[]>([])
  photosRef.current = photos
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const { toast } = useApp()
  const destinations = collections.filter((collection) => collection.accountId === accountId)
  const canMap = formatMode === 'single' && destination !== '' && picked.length > 1

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.url)
    }
  }, [])

  useEffect(() => {
    const next = picked.map((file) => ({
      url: URL.createObjectURL(file),
      video: file.type.startsWith('video/'),
    }))
    setCoverPreviews(next)
    return () => {
      for (const item of next) URL.revokeObjectURL(item.url)
    }
  }, [picked])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploading) return
    if (!accountId) {
      setError('Choose a client account.')
      return
    }
    if (destination === 'new' && !collectionName.trim()) {
      setError('Name the collection.')
      return
    }
    if (formatMode === 'several') {
      await uploadSeveral()
      return
    }
    if (picked.length === 0) {
      setError('Choose a photo or video.')
      return
    }
    if (canMap && maps.some((map) => map.order.length < 2)) {
      setError('Each content map needs at least two files.')
      return
    }

    setUploading(true)
    setError('')
    let destinationId = destination === 'new' ? '' : destination
    const namedCollection = destination === 'new' ? collectionName : ''
    const fileIds: string[] = []
    try {
      const names = standardNames
        ? await standardFileNames(picked, accountId, destination === 'new' ? '' : destination, destination === 'new' ? collectionName : '')
        : picked.map((file) => file.name)
      for (let index = 0; index < picked.length; index += 1) {
        const file = picked[index]
        if (!file) continue
        setProgress(`Uploading ${index + 1} of ${picked.length}`)
        const saved = await uploadOne(
          file,
          names[index] ?? file.name,
          accountId,
          destinationId,
          destinationId ? '' : namedCollection,
          destinationId ? '' : collectionDescription,
          tags,
          picked.length > 1 && useMode === 'each' ? (fileUses[index] ?? '') : suggestedUse,
          [],
        )
        destinationId = saved.destinationId
        fileIds.push(saved.fileId)
      }
      if (destination === 'new' && destinationId && fileIds.length > 0) {
        const coverId = fileIds[coverIndex] ?? fileIds[0]
        if (coverId) {
          const savedCover = await setCollectionCover({ accountId, folderId: destinationId, fileId: coverId })
          if (!savedCover.ok) toast(savedCover.message)
        }
      }
      if (canMap && destinationId) {
        const ready = maps
          .map((map) => ({
            description: map.description,
            fileIds: map.order.map((index) => fileIds[index] ?? '').filter((id) => id.length > 0),
          }))
          .filter((map) => map.fileIds.length >= 2)
        if (ready.length > 0) {
          const savedMaps = await saveCollectionMaps({
            accountId,
            folderId: destinationId,
            maps: ready,
          })
          if (!savedMaps.ok) toast(savedMaps.message)
        }
      }
      onUploaded()
    } catch (uploadError) {
      setUploading(false)
      setProgress('')
      setError(uploadError instanceof Error ? uploadError.message : 'The file could not be saved to Drive.')
    }
  }

  function updatePhoto(next: PhotoDraft) {
    setPhotos((current) => current.map((photo) => (photo.key === next.key ? next : photo)))
  }

  function removePhoto(key: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.key === key)
      if (photo) URL.revokeObjectURL(photo.url)
      return current.filter((item) => item.key !== key)
    })
  }

  async function uploadSeveral() {
    if (photos.length === 0) {
      setError('Choose at least one photo.')
      return
    }
    const prepared: { photo: PhotoDraft; customs: ReadyCustomSize[] }[] = []
    for (const photo of photos) {
      if (!isImageFile(photo.file)) {
        setError('Each file needs to be a photo.')
        return
      }
      switch (severalMode) {
        case 'ready':
          for (const format of EXPORT_FORMATS) {
            const extra = photo.readyFiles[format.id]
            if (extra && !isImageFile(extra)) {
              setError(`${format.label} needs to be a photo.`)
              return
            }
          }
          prepared.push({ photo, customs: [] })
          break
        case 'make': {
          const customs = readReadyCustoms(photo)
          if ('error' in customs) {
            setError(customs.error)
            return
          }
          prepared.push({ photo, customs })
          break
        }
        default: {
          const unreachable: never = severalMode
          setError(unreachable)
          return
        }
      }
    }
    setUploading(true)
    setError('')
    let destinationId = destination === 'new' ? '' : destination
    const namedCollection = destination === 'new' ? collectionName : ''
    const fileIds: string[] = []
    try {
      const names = standardNames
        ? await standardFileNames(prepared.map((item) => item.photo.file), accountId, destination === 'new' ? '' : destination, destination === 'new' ? collectionName : '')
        : prepared.map((item) => item.photo.file.name)
      for (let index = 0; index < prepared.length; index += 1) {
        const item = prepared[index]
        if (!item) continue
        const defaultName = names[index] ?? item.photo.file.name
        setProgress(`Uploading photo ${index + 1} of ${prepared.length}`)
        const saved = await uploadOne(
          item.photo.file,
          defaultName,
          accountId,
          destinationId,
          destinationId ? '' : namedCollection,
          destinationId ? '' : collectionDescription,
          tags,
          suggestedUse,
          [],
        )
        if (!saved.fileId) throw new Error('The photo could not be saved to Drive.')
        destinationId = saved.destinationId
        fileIds.push(saved.fileId)
        switch (severalMode) {
          case 'ready':
            for (const format of EXPORT_FORMATS) {
              const extra = item.photo.readyFiles[format.id]
              if (!extra) continue
              setProgress(`Photo ${index + 1} · ${format.label}`)
              await uploadOne(extra, variantFileName(defaultName, format.id), accountId, destinationId, '', '', '', '', [], {
                parentId: saved.fileId,
                format: format.id,
              })
            }
            break
          case 'make':
            for (const format of EXPORT_FORMATS) {
              if (!item.photo.makeFormats.includes(format.id)) continue
              setProgress(`Photo ${index + 1} · ${format.label}`)
              const blob = await renderCrop(item.photo.url, format.width, format.height, item.photo.cropFrames[format.id] ?? CENTER_CROP)
              const file = new File([blob], jpegVariantName(defaultName, format.id), { type: 'image/jpeg' })
              await uploadOne(file, file.name, accountId, destinationId, '', '', '', '', [], {
                parentId: saved.fileId,
                format: format.id,
              })
            }
            for (let customIndex = 0; customIndex < item.customs.length; customIndex += 1) {
              const custom = item.customs[customIndex]
              if (!custom) continue
              setProgress(`Photo ${index + 1} · ${custom.name}`)
              const blob = await renderCrop(item.photo.url, custom.width, custom.height, custom.frame)
              const formatId = customFormatId(custom.name, customIndex)
              const file = new File([blob], jpegVariantName(defaultName, formatId), { type: 'image/jpeg' })
              await uploadOne(file, file.name, accountId, destinationId, '', '', '', '', [], {
                parentId: saved.fileId,
                customId: formatId,
                customLabel: custom.name,
                customWidth: custom.width,
                customHeight: custom.height,
              })
            }
            break
          default: {
            const unreachable: never = severalMode
            throw new Error(unreachable)
          }
        }
      }
      if (destination === 'new' && destinationId && fileIds.length > 0) {
        const coverId = fileIds[coverIndex] ?? fileIds[0]
        if (coverId) {
          const savedCover = await setCollectionCover({ accountId, folderId: destinationId, fileId: coverId })
          if (!savedCover.ok) toast(savedCover.message)
        }
      }
      onUploaded()
    } catch (uploadError) {
      setUploading(false)
      setProgress('')
      setError(uploadError instanceof Error ? uploadError.message : 'The file could not be saved to Drive.')
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={() => (uploading ? undefined : onClose())} />
      <form className="card upload-dialog upload-dialog-wide" onSubmit={(event) => void onSubmit(event)}>
        <div className="upload-head">
          <div>
            <div className="eyebrow">Google Drive</div>
            <h2>Upload assets</h2>
          </div>
          <button type="button" className="close" onClick={onClose} disabled={uploading} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <p className="upload-note">
          Files are saved in the client folder inside Clients. A new collection stays hidden until you publish it. Files added
          to the library show up in My Content straight away.
        </p>
        <div className="field">
          <label htmlFor="upload-account">Client</label>
          <select
            id="upload-account"
            value={accountId}
            disabled={uploading || accounts.length === 0}
            onChange={(event) => {
              setAccountId(event.target.value)
              setDestination('')
            }}
          >
            {accounts.length === 0 ? <option value="">No client folder yet</option> : null}
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="upload-destination">Destination</label>
          <select
            id="upload-destination"
            value={destination}
            disabled={uploading}
            onChange={(event) => setDestination(event.target.value)}
          >
            <option value="">Library</option>
            {destinations.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.title} · {collection.published ? 'Published' : 'Draft'}
              </option>
            ))}
            <option value="new">New collection</option>
          </select>
        </div>
        {destination === 'new' ? (
          <div className="field">
            <label htmlFor="upload-collection">Collection name</label>
            <input
              id="upload-collection"
              value={collectionName}
              disabled={uploading}
              onChange={(event) => setCollectionName(event.target.value)}
            />
          </div>
        ) : null}
        {destination === 'new' ? (
          <div className="field">
            <label htmlFor="upload-collection-description">Collection description</label>
            <textarea
              id="upload-collection-description"
              value={collectionDescription}
              disabled={uploading}
              maxLength={500}
              placeholder="Optional. Shown on the collection."
              onChange={(event) => setCollectionDescription(event.target.value)}
            />
          </div>
        ) : null}
        {destination === 'new' ? (
          <CoverChoices
            items={
              formatMode === 'several'
                ? photos.map((photo) => ({ key: photo.key, label: photo.file.name, url: photo.url, video: false }))
                : coverPreviews.map((item, index) => ({
                    key: `${item.url}-${index}`,
                    label: picked[index]?.name ?? 'File',
                    url: item.url,
                    video: item.video,
                  }))
            }
            selected={coverIndex}
            disabled={uploading}
            onSelect={setCoverIndex}
          />
        ) : null}
        <div className="field">
          <label htmlFor="upload-tags">Tags</label>
          <input
            id="upload-tags"
            value={tags}
            disabled={uploading}
            placeholder="Instagram, Campaigns"
            onChange={(event) => setTags(event.target.value)}
          />
        </div>
        {picked.length > 1 ? (
          <div className="upload-choice">
            <span>Suggested use</span>
            <div className="inline-controls">
              <button type="button" className={useMode === 'shared' ? 'pill active' : 'pill'} disabled={uploading} onClick={() => setUseMode('shared')}>
                Same for every file
              </button>
              <button type="button" className={useMode === 'each' ? 'pill active' : 'pill'} disabled={uploading} onClick={() => setUseMode('each')}>
                Specific to each file
              </button>
            </div>
          </div>
        ) : null}
        {picked.length <= 1 || useMode === 'shared' ? (
          <div className="field">
            <label htmlFor="upload-use">Suggested use</label>
            <textarea
              id="upload-use"
              value={suggestedUse}
              disabled={uploading}
              maxLength={500}
              placeholder="Optional. How the client should use this file."
              onChange={(event) => setSuggestedUse(event.target.value)}
            />
          </div>
        ) : (
          <div className="upload-uses">
            {picked.map((file, index) => (
              <label key={`${file.name}-${file.size}-${index}`} className="field">
                <span>{file.name}</span>
                <textarea
                  value={fileUses[index] ?? ''}
                  disabled={uploading}
                  maxLength={500}
                  placeholder="Optional suggested use for this file."
                  onChange={(event) =>
                    setFileUses((current) => {
                      const next = picked.map((_, item) => current[item] ?? '')
                      next[index] = event.target.value
                      return next
                    })
                  }
                />
              </label>
            ))}
          </div>
        )}
        <div className="upload-choice">
          <span>Are all of these photos a single format?</span>
          <div className="inline-controls">
            <button
              type="button"
              className={formatMode === 'single' ? 'pill active' : 'pill'}
              disabled={uploading}
              onClick={() => setFormatMode('single')}
            >
              One format
            </button>
            <button
              type="button"
              className={formatMode === 'several' ? 'pill active' : 'pill'}
              disabled={uploading}
              onClick={() => {
                setFormatMode('several')
                setPicked([])
                setFileUses([])
                setMaps([])
                setUseMode('shared')
              }}
            >
              Several formats
            </button>
          </div>
        </div>
        {formatMode === 'single' ? (
          <div className="field">
            <label htmlFor="upload-files">Files</label>
            <input
              id="upload-files"
              type="file"
              accept="image/*,video/*"
              multiple
              disabled={uploading}
              required={picked.length === 0}
              onChange={(event) => {
                const next = [...(event.target.files ?? [])]
                setPicked(next)
                setFileUses(next.map(() => ''))
                setUseMode('shared')
                setMaps([])
              }}
            />
          </div>
        ) : null}
        {formatMode === 'several' ? (
          <div className="format-uploads">
            <p>Add the photos people see in the library. Scroll sideways when there is more than one.</p>
            <div className="inline-controls">
              <button
                type="button"
                className={severalMode === 'ready' ? 'pill active' : 'pill'}
                disabled={uploading}
                onClick={() => setSeveralMode('ready')}
              >
                Upload finished files
              </button>
              <button
                type="button"
                className={severalMode === 'make' ? 'pill active' : 'pill'}
                disabled={uploading}
                onClick={() => setSeveralMode('make')}
              >
                Make formats here
              </button>
            </div>
            <label className="field">
              <span>Photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                required={photos.length === 0}
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])]
                  const images = files.filter(isImageFile)
                  if (images.length !== files.length) setError('Each file needs to be a photo.')
                  setPhotos((current) => [...current, ...images.map(blankPhoto)])
                  event.target.value = ''
                }}
              />
            </label>
            <PhotoRail photos={photos} mode={severalMode} uploading={uploading} onChange={updatePhoto} onRemove={removePhoto} />
          </div>
        ) : null}
        {formatMode === 'single' && picked.length > 0 || formatMode === 'several' && photos.length > 0 ? (
          <label className="upload-check">
            <input type="checkbox" checked={standardNames} disabled={uploading} onChange={(event) => setStandardNames(event.target.checked)} />
            <span>Rename to Photo #1, Video #1, and so on. Numbers continue from the standard names already in this folder.</span>
          </label>
        ) : null}
        {canMap ? <UploadMaps files={picked} maps={maps} onChange={setMaps} /> : null}
        {error ? <div className="demo-note">{error}</div> : null}
        <button type="submit" className="btn primary wide" disabled={uploading || accounts.length === 0}>
          {uploading ? progress || 'Uploading' : 'Save to Drive'}
        </button>
      </form>
    </>
  )
}

async function standardFileNames(files: File[], accountId: string, destinationId: string, collectionName: string): Promise<string[]> {
  const starts = await nextStandardNames({ accountId, destinationId, collectionName })
  if (!starts.ok) throw new Error(starts.message)
  let photo = starts.photo
  let video = starts.video
  return files.map((file) => {
    const videoFile = isVideoFile(file)
    const number = videoFile ? video : photo
    if (videoFile) video += 1
    else photo += 1
    if (number > 9999) throw new Error('This folder already has too many standard names.')
    return `${videoFile ? 'Video' : 'Photo'} #${number}${fileExtension(file)}`
  })
}

function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true
  const extension = fileExtension(file)
  return extension === '.mp4' || extension === '.mov' || extension === '.webm'
}

function fileExtension(file: File): string {
  const dot = file.name.lastIndexOf('.')
  const fromName = dot > 0 ? file.name.slice(dot).toLowerCase() : ''
  if (/^\.[a-z0-9]{2,5}$/.test(fromName)) return fromName
  switch (file.type) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'image/gif':
      return '.gif'
    case 'image/heic':
      return '.heic'
    case 'image/heif':
      return '.heif'
    case 'video/mp4':
      return '.mp4'
    case 'video/quicktime':
      return '.mov'
    case 'video/webm':
      return '.webm'
    default:
      return ''
  }
}

function readReadyCustoms(photo: PhotoDraft): ReadyCustomSize[] | { error: string } {
  const sizes: ReadyCustomSize[] = []
  for (const row of photo.customs) {
    const size = readCustomSize(row)
    if (!size) continue
    if ('error' in size) return size
    sizes.push(size)
  }
  return sizes
}

function jpegVariantName(fileName: string, formatId: string): string {
  const named = variantFileName(fileName, formatId)
  const stem = named.replace(/\.[^.]+$/i, '')
  return `${stem}.jpg`
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)
}

async function uploadOne(
  file: File,
  fileName: string,
  accountId: string,
  destinationId: string,
  collectionName: string,
  collectionDescription: string,
  tags: string,
  suggestedUse: string,
  formats: ExportId[],
  variant?: { parentId: string; format?: ExportId; customId?: string; customLabel?: string; customWidth?: number; customHeight?: number },
): Promise<{ destinationId: string; fileId: string }> {
  const started = await fetch('/api/admin/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountId,
      destinationId,
      collectionName,
      collectionDescription,
      fileName,
      mimeType: file.type,
      size: file.size,
      tags,
      suggestedUse,
      formats,
      variantParentId: variant?.parentId ?? '',
      variantFormat: variant?.format ?? null,
      variantCustomId: variant?.customId ?? '',
      variantCustomLabel: variant?.customLabel ?? '',
      variantCustomWidth: variant?.customWidth ?? 0,
      variantCustomHeight: variant?.customHeight ?? 0,
    }),
  })
  const startedBody: unknown = await started.json().catch(() => null)
  if (!started.ok || !isUploadSession(startedBody)) throw new Error(messageFrom(startedBody, 'The upload could not be started.'))

  const saved = await fetch('/api/admin/uploads', {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-Upload-Ticket': startedBody.ticket,
    },
    body: file,
  })
  const savedBody: unknown = await saved.json().catch(() => null)
  if (!saved.ok) throw new Error(messageFrom(savedBody, 'The file could not be saved to Drive.'))
  return {
    destinationId: startedBody.destinationId,
    fileId: isSavedFile(savedBody) ? savedBody.fileId : '',
  }
}

function isSavedFile(value: unknown): value is { fileId: string } {
  if (!value || typeof value !== 'object' || !('fileId' in value)) return false
  return typeof (value as { fileId?: unknown }).fileId === 'string'
}

function isUploadSession(value: unknown): value is { ticket: string; destinationId: string } {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return typeof body.ticket === 'string' && typeof body.destinationId === 'string'
}

function messageFrom(value: unknown, fallback: string): string {
  if (!value || typeof value !== 'object' || !('error' in value)) return fallback
  const error = (value as { error?: unknown }).error
  return typeof error === 'string' && error ? error : fallback
}

function CollectionMenu({
  collection,
  onPublished,
  onDelete,
}: {
  collection: AdminCollectionRow
  onPublished: (published: boolean) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<{ top: number; left: number; above: boolean } | null>(null)
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    function closeOnOutside(event: PointerEvent) {
      const target = event.target
      const wrap = buttonRef.current?.parentElement
      if (target instanceof Node && wrap?.contains(target)) return
      setOpen(false)
      setConfirmDelete(false)
    }
    function closeOnKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnKey)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnKey)
    }
  }, [open])

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const above = window.innerHeight - rect.bottom < 120
    setPlace({ top: above ? rect.top - 8 : rect.bottom + 8, left: rect.right, above })
    setOpen((current) => !current)
  }

  async function choose(published: boolean) {
    setPending(true)
    setOpen(false)
    setConfirmDelete(false)
    await onPublished(published)
    setPending(false)
  }

  async function remove() {
    setPending(true)
    setOpen(false)
    setConfirmDelete(false)
    await onDelete()
    setPending(false)
  }

  const nextPublished = !collection.published

  return (
    <div className="kebab-wrap" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        className="kebab"
        aria-label={`Actions for ${collection.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={toggle}
      >
        •••
      </button>
      {open && place ? (
        <div
          className="kebab-menu"
          role="menu"
          style={{
            top: place.top,
            left: place.left,
            transform: place.above ? 'translate(-100%, -100%)' : 'translateX(-100%)',
          }}
        >
          <button type="button" role="menuitem" onClick={() => void choose(nextPublished)}>
            {collection.published ? 'Move to draft' : 'Publish'}
          </button>
          {confirmDelete ? (
            <button type="button" role="menuitem" className="danger" onClick={() => void remove()}>
              Confirm delete
            </button>
          ) : (
            <button type="button" role="menuitem" className="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
