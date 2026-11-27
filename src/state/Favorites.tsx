'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { toggleFavorite } from '@/lib/favorites/actions'
import { useApp } from '@/state/AppState'

type FavoritesValue = {
  ids: string[]
  isPending: (fileId: string) => boolean
  toggle: (fileId: string) => void
}

const FavoritesContext = createContext<FavoritesValue | null>(null)

export function FavoritesProvider({ fileIds, children }: { fileIds: string[]; children: ReactNode }) {
  const { toast } = useApp()
  const [ids, setIds] = useState(fileIds)
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const pendingRef = useRef<Set<string>>(new Set())
  const idsRef = useRef<string[]>(fileIds)
  idsRef.current = ids

  useEffect(() => {
    setIds(fileIds)
  }, [fileIds])

  const toggle = useCallback(
    (fileId: string) => {
      if (pendingRef.current.has(fileId)) return
      const had = idsRef.current.includes(fileId)
      pendingRef.current.add(fileId)
      setPendingIds(new Set(pendingRef.current))
      setIds((current) => (had ? current.filter((id) => id !== fileId) : current.includes(fileId) ? current : [...current, fileId]))
      void toggleFavorite(fileId)
        .then((result) => {
          if (!result.ok) {
            setIds((current) => (had ? (current.includes(fileId) ? current : [...current, fileId]) : current.filter((id) => id !== fileId)))
            toast(result.message)
            return
          }
          setIds(result.fileIds)
        })
        .catch(() => {
          setIds((current) => (had ? (current.includes(fileId) ? current : [...current, fileId]) : current.filter((id) => id !== fileId)))
          toast('Favorites could not be updated.')
        })
        .finally(() => {
          pendingRef.current.delete(fileId)
          setPendingIds(new Set(pendingRef.current))
        })
    },
    [toast],
  )

  const value = useMemo<FavoritesValue>(
    () => ({
      ids,
      isPending: (fileId: string) => pendingIds.has(fileId),
      toggle,
    }),
    [ids, pendingIds, toggle],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites(): FavoritesValue {
  const value = useContext(FavoritesContext)
  if (!value) throw new Error('useFavorites must be used within FavoritesProvider')
  return value
}
