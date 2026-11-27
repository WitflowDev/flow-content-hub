'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ChannelFilter, ContentTypeFilter, SortMode, ViewMode } from '@/data/types'

let signOutHandler: (() => Promise<void>) | null = null

export function registerSignOutHandler(handler: (() => Promise<void>) | null): void {
  signOutHandler = handler
}

type ToastType = '' | 'success'

type ToastItem = {
  id: number
  message: string
  type: ToastType
}

type AppActionsValue = {
  openDrawer: () => void
  closeDrawer: () => void
  toggleNotifications: () => void
  closeNotifications: () => void
  openGuide: (id: string) => void
  closeGuide: () => void
  toggleMobileNav: () => void
  navigate: (path: string, closeNav?: boolean) => void
  toast: (message: string, type?: ToastType) => void
  logout: () => void
}

type AppContextValue = AppActionsValue & {
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
  notifications: boolean
  selectedService: string
  setSelectedService: (value: string) => void
  guide: string | null
  mobileNav: boolean
}

const AppContext = createContext<AppContextValue | null>(null)
const AppActionsContext = createContext<AppActionsValue | null>(null)
const SelectedContext = createContext<Set<string> | null>(null)
const SelectionActionsContext = createContext<{
  toggleSelected: (id: string) => void
  clearSelected: () => void
} | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used within AppStateProvider')
  return value
}

export function useAppActions(): AppActionsValue {
  const value = useContext(AppActionsContext)
  if (!value) throw new Error('useAppActions must be used within AppStateProvider')
  return value
}

export function useSelected(): Set<string> {
  const value = useContext(SelectedContext)
  if (!value) throw new Error('useSelected must be used within AppStateProvider')
  return value
}

export function useSelectionActions(): { toggleSelected: (id: string) => void; clearSelected: () => void } {
  const value = useContext(SelectionActionsContext)
  if (!value) throw new Error('useSelectionActions must be used within AppStateProvider')
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
  const [mobileNav, setMobileNav] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])

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
  const closeNotifications = useCallback(() => setNotifications(false), [])

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
  const toggleMobileNav = useCallback(() => setMobileNav((current) => !current), [])

  const navigate = useCallback(
    (path: string, closeNav = false) => {
      if (closeNav) setMobileNav(false)
      setNotifications(false)
      setDrawer(false)
      setGuide(null)
      router.push(path)
    },
    [router],
  )

  const logout = useCallback(() => {
    setSearch('')
    setContentType('All')
    setChannel('All')
    setSort('Newest')
    setSelectedService('')
    setSelected(new Set())
    setGuide(null)
    setMobileNav(false)
    setDrawer(false)
    setNotifications(false)
    const runSignOut = signOutHandler
      ? signOutHandler()
      : fetch('/api/auth/session', { method: 'DELETE' }).then(() => undefined)
    void runSignOut.catch(() => undefined).finally(() => {
      router.push('/login')
      router.refresh()
    })
  }, [router])

  const selectionActions = useMemo(
    () => ({ toggleSelected, clearSelected }),
    [toggleSelected, clearSelected],
  )

  const appActions = useMemo<AppActionsValue>(
    () => ({
      openDrawer,
      closeDrawer,
      toggleNotifications,
      closeNotifications,
      openGuide,
      closeGuide,
      toggleMobileNav,
      navigate,
      toast,
      logout,
    }),
    [
      openDrawer,
      closeDrawer,
      toggleNotifications,
      closeNotifications,
      openGuide,
      closeGuide,
      toggleMobileNav,
      navigate,
      toast,
      logout,
    ],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      ...appActions,
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
      notifications,
      selectedService,
      setSelectedService,
      guide,
      mobileNav,
    }),
    [
      appActions,
      search,
      contentType,
      channel,
      sort,
      view,
      drawer,
      notifications,
      selectedService,
      guide,
      mobileNav,
    ],
  )

  return (
    <AppActionsContext.Provider value={appActions}>
      <AppContext.Provider value={value}>
        <SelectionActionsContext.Provider value={selectionActions}>
          <SelectedContext.Provider value={selected}>
            {children}
            <div id="toast-root" aria-live="polite">
              {toasts.map((item) => (
                <ToastMessage key={item.id} item={item} onDone={removeToast} />
              ))}
            </div>
          </SelectedContext.Provider>
        </SelectionActionsContext.Provider>
      </AppContext.Provider>
    </AppActionsContext.Provider>
  )
}
