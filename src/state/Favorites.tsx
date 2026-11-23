'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { toggleFavorite } from '@/lib/favorites/actions'
import { useApp } from '@/state/AppState'

type FavoritesValue = {
  ids: string[]
  pending: string
  toggle: (fileId: string) => void
}

const FavoritesContext = createContext<FavoritesValue | null>(null)

export function FavoritesProvider({ fileIds, children }: { fileIds: string[]; children: ReactNode }) {
  const { toast } = useApp()
  const [ids, setIds] = useState(fileIds)
  const [pending, setPending] = useState('')

  function toggle(fileId: string) {
    if (pending) return
    const had = ids.includes(fileId)
    setPending(fileId)
    setIds((current) => (had ? current.filter((id) => id !== fileId) : [...current, fileId]))
    void toggleFavorite(fileId).then((result) => {
      setPending('')
      if (!result.ok) {
        setIds((current) => (had ? [...current, fileId] : current.filter((id) => id !== fileId)))
        toast(result.message)
        return
      }
      setIds(result.fileIds)
    })
  }

  return <FavoritesContext.Provider value={{ ids, pending, toggle }}>{children}</FavoritesContext.Provider>
}

export function useFavorites(): FavoritesValue {
  const value = useContext(FavoritesContext)
  if (!value) throw new Error('useFavorites must be used within FavoritesProvider')
  return value
}
