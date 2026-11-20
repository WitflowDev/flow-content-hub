'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { InstagramCarousel } from '@/components/collections/InstagramCarousel'
import { Icon } from '@/components/icons'
import { adminPostMedia, CollectionMapsEditor, type DraftCarousel } from '@/components/screens/CollectionMapsEditor'
import { deleteAdminCollection, deleteAdminPost, deleteAdminPosts, loadAdminCollection, updateAdminCollection, updateAdminPost } from '@/lib/admin/content'
import type { AdminCollectionDetail, AdminCollectionRow, AdminPost } from '@/lib/admin/types'
import { useApp } from '@/state/AppState'

type Editor =
  | { kind: 'collection' }
  | { kind: 'post'; post: AdminPost }

export function AdminCollectionBoard({ collection, onBack }: { collection: AdminCollectionRow; onBack: () => void }) {
  const { toast } = useApp()
  const router = useRouter()
  const [detail, setDetail] = useState<AdminCollectionDetail | null>(null)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [confirmSelection, setConfirmSelection] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const selectAllRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    void loadAdminCollection({ accountId: collection.accountId, folderId: collection.id }).then((result) => {
      if (!active) return
      if (!result.ok) {
        setError(result.message)
        return
      }
      setDetail(result.detail)
    })
    return () => {
      active = false
    }
  }, [collection.accountId, collection.id])

  const posts = detail?.posts ?? []
  const selectedPosts = posts.filter((post) => selected.includes(post.id))
  const allSelected = posts.length > 0 && selectedPosts.length === posts.length

  useEffect(() => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate = selectedPosts.length > 0 && !allSelected
  }, [allSelected, selectedPosts.length])

  function toggleSelected(fileId: string) {
    setSelected((current) => (current.includes(fileId) ? current.filter((id) => id !== fileId) : [...current, fileId]))
  }

  function toggleAll() {
    setSelected(allSelected ? [] : posts.map((post) => post.id))
  }

  async function reload() {
    const result = await loadAdminCollection({ accountId: collection.accountId, folderId: collection.id })
    if (!result.ok) {
      toast(result.message)
      return
    }
    setDetail(result.detail)
    setSelected((current) => current.filter((id) => result.detail.posts.some((post) => post.id === id)))
    router.refresh()
  }

  async function removeSelected() {
    if (!detail || deleting || selectedPosts.length === 0) return
    setDeleting(true)
    const result = await deleteAdminPosts({
      accountId: collection.accountId,
      folderId: collection.id,
      fileIds: selectedPosts.map((post) => post.id),
    })
    setDeleting(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    setConfirmSelection(false)
    setSelected([])
    toast(selectedPosts.length === 1 ? 'Post removed from the library' : `${selectedPosts.length} files removed from the library`, 'success')
    await reload()
  }

  return (
    <div className="admin-board">
      <div className="admin-board-head">
        <div>
          <button type="button" className="link" onClick={onBack}>
            Back to dashboard
          </button>
          <h1>{detail?.title ?? collection.title}</h1>
          <p>
            {collection.accountLabel} · {detail ? detail.posts.length : collection.count} posts
          </p>
          {detail?.description ? <p className="admin-board-description">{detail.description}</p> : null}
        </div>
        <div className="admin-board-actions">
          <button type="button" className="btn ghost" onClick={() => setEditor({ kind: 'collection' })} disabled={!detail}>
            Edit collection
          </button>
        </div>
      </div>
      {detail && detail.maps.length > 0 ? (
        <div className="ig-board admin-carousels">
          {detail.maps.map((map, index) => (
            <InstagramCarousel
              key={`${detail.id}-map-${index}`}
              title={detail.title}
              description={map.description}
              items={map.fileIds.map((id) => detail.posts.find((post) => post.id === id)).flatMap((post) => (post ? [adminPostMedia(post, collection.clientFolderId)] : []))}
            />
          ))}
        </div>
      ) : null}
      {error ? <p className="admin-empty">{error}</p> : null}
      {!detail && !error ? <p className="admin-empty">Loading posts…</p> : null}
      {detail && detail.posts.length === 0 ? <p className="admin-empty">No posts in this collection yet.</p> : null}
      {detail && detail.posts.length > 0 ? (
        <>
          <div className="admin-select-bar">
            <label>
              <input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={toggleAll} />
              Select all
            </label>
            {selectedPosts.length > 0 ? (
              <button type="button" className="btn danger" disabled={deleting} onClick={() => setConfirmSelection(true)}>
                Delete selected ({selectedPosts.length})
              </button>
            ) : null}
          </div>
          <div className="admin-posts">
            {detail.posts.map((post) => (
              <article key={post.id} className={selected.includes(post.id) ? 'admin-post card on' : 'admin-post card'}>
                <label className="admin-select">
                  <input
                    type="checkbox"
                    checked={selected.includes(post.id)}
                    aria-label={`Select ${post.title}`}
                    onChange={() => toggleSelected(post.id)}
                  />
                </label>
                <button type="button" className="admin-post-open" onClick={() => setEditor({ kind: 'post', post })}>
                  <img
                    src={`/api/admin/files/${post.id}/thumbnail?folder=${collection.clientFolderId}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="admin-post-copy">
                    <b>{post.title}</b>
                    {post.description ? <small>{post.description}</small> : null}
                    {post.tags.length > 0 ? <small>{post.tags.join(', ')}</small> : null}
                  </span>
                </button>
              </article>
            ))}
          </div>
        </>
      ) : null}
      {confirmSelection ? (
        <div className="confirm-layer">
          <div className="card confirm-dialog" role="dialog" aria-modal="true">
            <h2>Delete files</h2>
            <p>{selectionDeleteCopy(selectedPosts)}</p>
            <p>They are removed from this collection and from any carousel that uses them.</p>
            <div className="admin-editor-actions">
              <button type="button" className="btn ghost" disabled={deleting} onClick={() => setConfirmSelection(false)}>
                Cancel
              </button>
              <button type="button" className="btn danger" disabled={deleting} onClick={() => void removeSelected()}>
                {deleting ? 'Deleting' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editor && detail ? (
        <CollectionEditor
          editor={editor}
          collection={collection}
          detail={detail}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null)
            toast('Saved', 'success')
            await reload()
          }}
          onDeletedPost={async () => {
            setEditor(null)
            toast('Post removed from the library', 'success')
            await reload()
          }}
          onDeletedCollection={() => {
            toast('Collection removed from the library', 'success')
            router.refresh()
            onBack()
          }}
        />
      ) : null}
    </div>
  )
}

function CollectionEditor({
  editor,
  collection,
  detail,
  onClose,
  onSaved,
  onDeletedPost,
  onDeletedCollection,
}: {
  editor: Editor
  collection: AdminCollectionRow
  detail: AdminCollectionDetail
  onClose: () => void
  onSaved: () => Promise<void>
  onDeletedPost: () => Promise<void>
  onDeletedCollection: () => void
}) {
  const { toast } = useApp()
  const post = editor.kind === 'post' ? editor.post : null
  const [title, setTitle] = useState(post ? post.title : detail.title)
  const [description, setDescription] = useState(post ? post.description : detail.description)
  const [tags, setTags] = useState(post ? post.tags.join(', ') : detail.tags.join(', '))
  const [carousels, setCarousels] = useState<DraftCarousel[]>(
    detail.maps.map((map, index) => ({ id: `saved-${index}`, description: map.description, fileIds: [...map.fileIds] })),
  )
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    const result = await saveEditor()
    setSaving(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    await onSaved()
  }

  async function saveEditor(): Promise<{ ok: true } | { ok: false; message: string }> {
    switch (editor.kind) {
      case 'post':
        return updateAdminPost({
          accountId: collection.accountId,
          folderId: collection.id,
          fileId: editor.post.id,
          title,
          description,
          tags,
        })
      case 'collection':
        if (carousels.some((map) => map.fileIds.length < 2)) {
          return { ok: false, message: 'Each carousel needs at least two files from this collection.' }
        }
        return updateAdminCollection({
          accountId: collection.accountId,
          folderId: collection.id,
          title,
          description,
          tags,
          published: collection.published,
          maps: carousels.map((map) => ({ fileIds: map.fileIds, description: map.description })),
        })
      default: {
        const unexpected: never = editor
        return unexpected
      }
    }
  }

  async function remove() {
    if (saving) return
    setSaving(true)
    const result = await deleteEditor()
    setSaving(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    switch (editor.kind) {
      case 'post':
        await onDeletedPost()
        return
      case 'collection':
        onDeletedCollection()
        return
      default: {
        const unexpected: never = editor
        return unexpected
      }
    }
  }

  function deleteEditor(): Promise<{ ok: true } | { ok: false; message: string }> {
    switch (editor.kind) {
      case 'post':
        return deleteAdminPost({ accountId: collection.accountId, folderId: collection.id, fileId: editor.post.id })
      case 'collection':
        return deleteAdminCollection({ accountId: collection.accountId, folderId: collection.id })
      default: {
        const unexpected: never = editor
        return unexpected
      }
    }
  }

  const heading = editor.kind === 'post' ? 'Edit post' : 'Edit collection'

  return (
    <>
      <div className="modal-backdrop" onClick={() => (saving ? undefined : onClose())} />
      <form className={editor.kind === 'collection' ? 'card upload-dialog editor-wide' : 'card upload-dialog'} onSubmit={(event) => void onSubmit(event)}>
        <div className="upload-head">
          <div>
            <div className="eyebrow">{collection.title}</div>
            <h2>{heading}</h2>
          </div>
          <button type="button" className="close" onClick={onClose} disabled={saving} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="field">
          <label htmlFor="edit-title">Title</label>
          <input id="edit-title" value={title} disabled={saving} maxLength={140} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="edit-description">Description</label>
          <textarea
            id="edit-description"
            value={description}
            disabled={saving}
            maxLength={500}
            placeholder={editor.kind === 'post' ? 'Optional. Shown to the client as suggested use.' : 'Optional. Shown on the collection.'}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="edit-tags">Tags</label>
          <input
            id="edit-tags"
            value={tags}
            disabled={saving}
            placeholder="Instagram, Campaigns"
            onChange={(event) => setTags(event.target.value)}
          />
        </div>
        {editor.kind === 'collection' ? (
          <CollectionMapsEditor
            posts={detail.posts}
            clientFolderId={collection.clientFolderId}
            maps={carousels}
            disabled={saving}
            onChange={setCarousels}
          />
        ) : null}
        <div className="admin-editor-actions">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving' : 'Save'}
          </button>
          {editor.kind === 'post' && confirmDelete ? (
            <button type="button" className="btn danger" disabled={saving} onClick={() => void remove()}>
              Confirm delete
            </button>
          ) : (
            <button type="button" className="btn ghost" disabled={saving} onClick={() => setConfirmDelete(true)}>
              {editor.kind === 'collection' ? 'Delete collection' : 'Delete'}
            </button>
          )}
        </div>
      </form>
      {confirmDelete && editor.kind === 'collection' ? (
        <div className="confirm-layer">
          <div className="card confirm-dialog" role="dialog" aria-modal="true">
            <h2>Delete collection</h2>
            <p>{collectionDeleteCopy(detail.posts)}</p>
            {detail.posts.length > 0 ? <p>The files in this collection are deleted too.</p> : null}
            <div className="admin-editor-actions">
              <button type="button" className="btn ghost" disabled={saving} onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button type="button" className="btn danger" disabled={saving} onClick={() => void remove()}>
                {saving ? 'Deleting' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function selectionDeleteCopy(posts: AdminPost[]): string {
  const photos = posts.filter((post) => !post.video).length
  const videos = posts.length - photos
  if (photos > 0 && videos === 0) return `Delete ${photos} ${photos === 1 ? 'photo' : 'photos'}?`
  if (videos > 0 && photos === 0) return `Delete ${videos} ${videos === 1 ? 'video' : 'videos'}?`
  const photoLabel = photos === 1 ? 'photo' : 'photos'
  const videoLabel = videos === 1 ? 'video' : 'videos'
  return `Delete ${photos} ${photoLabel} and ${videos} ${videoLabel}?`
}

function collectionDeleteCopy(posts: AdminPost[]): string {
  const photos = posts.filter((post) => !post.video).length
  const videos = posts.length - photos
  if (photos > 0 && videos === 0) {
    return `This collection has ${photos} ${photos === 1 ? 'photo' : 'photos'}. Are you sure you want to delete?`
  }
  if (videos > 0 && photos === 0) {
    return `This collection has ${videos} ${videos === 1 ? 'video' : 'videos'}. Are you sure you want to delete?`
  }
  if (photos > 0 && videos > 0) {
    const photoLabel = photos === 1 ? 'photo' : 'photos'
    const videoLabel = videos === 1 ? 'video' : 'videos'
    return `This collection has ${photos} ${photoLabel} and ${videos} ${videoLabel}. Are you sure you want to delete?`
  }
  return 'Delete this collection?'
}
