'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { TIP_KEY } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import type { ChannelFilter, ContentTypeFilter, SortMode, ViewMode } from '@/data/types'

type ToastType = '' | 'success'

type ToastItem = {
  id: number
  message: string
  type: ToastType
}

type AppContextValue = {
  search: string
  setSearch: (value: string) => void
  contentType: ContentTypeFilter
  setContentType: (value: ContentTypeFilter) => void
  channel: ChannelFilter
  setChannel: (value: ChannelFilter) => void
  sort: SortMode
  setSort: (value: SortMode) => void
  view: ViewMode
  setView: (value: ViewMode) => void
  drawer: boolean
  openDrawer: () => void
  closeDrawer: () => void
  notifications: boolean
  toggleNotifications: () => void
  selectedService: string
  setSelectedService: (value: string) => void
  selected: Set<string>
  toggleSelected: (id: string) => void
  clearSelected: () => void
  guide: string | null
  openGuide: (id: string) => void
  closeGuide: () => void
  tipVisible: boolean
  mounted: boolean
  dismissTip: () => void
  mobileNav: boolean
  toggleMobileNav: () => void
  navigate: (path: string, closeNav?: boolean) => void
  toast: (message: string, type?: ToastType) => void
  logout: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used within AppStateProvider')
  return value
}

function ToastMessage({ item, onDone }: { item: ToastItem; onDone: (id: number) => void }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShow(true))
    const hideTimer = window.setTimeout(() => setShow(false), 2400)
    const removeTimer = window.setTimeout(() => onDone(item.id), 2620)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(hideTimer)
      window.clearTimeout(removeTimer)
    }
  }, [item.id, onDone])

  const className = item.type ? `toast ${item.type}` : 'toast'
  return (
    <div className={show ? `${className} show` : className}>
      <span>{item.type === 'success' ? '✓' : '•'}</span>
      {item.message}
    </div>
  )
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const nextToastId = useRef(1)
  const [search, setSearch] = useState('')
  const [contentType, setContentType] = useState<ContentTypeFilter>('All')
  const [channel, setChannel] = useState<ChannelFilter>('All')
  const [sort, setSort] = useState<SortMode>('Newest')
  const [view, setView] = useState<ViewMode>('grid')
  const [drawer, setDrawer] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [selectedService, setSelectedService] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [guide, setGuide] = useState<string | null>(null)
  const [tipVisible, setTipVisible] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    setTipVisible(localStorage.getItem(TIP_KEY) !== 'dismissed')
    setMounted(true)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = '') => {
    const id = nextToastId.current
    nextToastId.current += 1
    setToasts((current) => [...current, { id, message, type }])
  }, [])

  const openDrawer = useCallback(() => {
    setNotifications(false)
    setDrawer(true)
  }, [])

  const closeDrawer = useCallback(() => setDrawer(false), [])
  const toggleNotifications = useCallback(() => setNotifications((current) => !current), [])

  const toggleSelected = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelected = useCallback(() => setSelected(new Set()), [])
  const openGuide = useCallback((id: string) => setGuide(id), [])
  const closeGuide = useCallback(() => setGuide(null), [])

  const dismissTip = useCallback(() => {
    setTipVisible(false)
    localStorage.setItem(TIP_KEY, 'dismissed')
  }, [])

  const toggleMobileNav = useCallback(() => setMobileNav((current) => !current), [])

  const navigate = useCallback(
    (path: string, closeNav = false) => {
      if (closeNav) setMobileNav(false)
      router.push(path)
    },
    [router],
  )

  const logout = useCallback(() => {
    setDrawer(false)
    setNotifications(false)
    void createClient()
      .auth.signOut()
      .finally(() => {
        router.push('/login')
        router.refresh()
      })
  }, [router])

  const value = useMemo<AppContextValue>(
    () => ({
      search,
      setSearch,
      contentType,
      setContentType,
      channel,
      setChannel,
      sort,
      setSort,
      view,
      setView,
      drawer,
      openDrawer,
      closeDrawer,
      notifications,
      toggleNotifications,
      selectedService,
      setSelectedService,
      selected,
      toggleSelected,
      clearSelected,
      guide,
      openGuide,
      closeGuide,
      tipVisible,
      mounted,
      dismissTip,
      mobileNav,
      toggleMobileNav,
      navigate,
      toast,
      logout,
    }),
    [
      search,
      setSearch,
      contentType,
      setContentType,
      channel,
      setChannel,
      sort,
      setSort,
      view,
      setView,
      drawer,
      openDrawer,
      closeDrawer,
      notifications,
      toggleNotifications,
      selectedService,
      setSelectedService,
      selected,
      toggleSelected,
      clearSelected,
      guide,
      openGuide,
      closeGuide,
      tipVisible,
      mounted,
      dismissTip,
      mobileNav,
      toggleMobileNav,
      navigate,
      toast,
      logout,
    ],
  )

  return (
    <AppContext.Provider value={value}>
      {children}
      <div id="toast-root" aria-live="polite">
        {toasts.map((item) => (
          <ToastMessage key={item.id} item={item} onDone={removeToast} />
        ))}
      </div>
    </AppContext.Provider>
  )
}
