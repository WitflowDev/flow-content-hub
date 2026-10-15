import type { ReactNode } from 'react'

export type IconName =
  | 'home'
  | 'folder'
  | 'layers'
  | 'book'
  | 'search'
  | 'bell'
  | 'chat'
  | 'light'
  | 'download'
  | 'share'
  | 'play'
  | 'arrow'
  | 'close'
  | 'check'
  | 'grid'
  | 'list'
  | 'plus'
  | 'users'
  | 'upload'

function StrokeIcon({ strokeWidth, children }: { strokeWidth: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      {children}
    </svg>
  )
}

function renderIcon(name: IconName): ReactNode {
  switch (name) {
    case 'home':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13v-9.5" />
          <path d="M9.5 20v-6h5v6" />
        </StrokeIcon>
      )
    case 'folder':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="M3.5 6.5h6l2 2h9v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
        </StrokeIcon>
      )
    case 'layers':
      return (
        <StrokeIcon strokeWidth={1.7}>
          <path d="m12 3 9 5-9 5-9-5z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 16 9 5 9-5" />
        </StrokeIcon>
      )
    case 'book':
      return (
        <StrokeIcon strokeWidth={1.7}>
          <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22z" />
          <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22z" />
        </StrokeIcon>
      )
    case 'search':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </StrokeIcon>
      )
    case 'bell':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </StrokeIcon>
      )
    case 'chat':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9 9 0 0 1-4.2-1L3 21l1.5-4.6A8.3 8.3 0 0 1 3 11.5 8.5 8.5 0 1 1 21 11.5Z" />
        </StrokeIcon>
      )
    case 'light':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M8 14a7 7 0 1 1 8 0c-1 .8-1.3 1.4-1.5 2h-5c-.2-.6-.5-1.2-1.5-2Z" />
        </StrokeIcon>
      )
    case 'download':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </StrokeIcon>
      )
    case 'share':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
          <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
        </StrokeIcon>
      )
    case 'play':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      )
    case 'arrow':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="M5 12h14" />
          <path d="m14 7 5 5-5 5" />
        </StrokeIcon>
      )
    case 'close':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="m6 6 12 12M18 6 6 18" />
        </StrokeIcon>
      )
    case 'check':
      return (
        <StrokeIcon strokeWidth={2}>
          <path d="m5 12 4 4L19 6" />
        </StrokeIcon>
      )
    case 'grid':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </StrokeIcon>
      )
    case 'list':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="3.5" cy="6" r="1" fill="currentColor" />
          <circle cx="3.5" cy="12" r="1" fill="currentColor" />
          <circle cx="3.5" cy="18" r="1" fill="currentColor" />
        </StrokeIcon>
      )
    case 'plus':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="M12 5v14M5 12h14" />
        </StrokeIcon>
      )
    case 'users':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <circle cx="9" cy="8" r="4" />
          <path d="M2 21c0-4 3-7 7-7s7 3 7 7" />
          <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.8 4 3 4 6" />
        </StrokeIcon>
      )
    case 'upload':
      return (
        <StrokeIcon strokeWidth={1.8}>
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M5 20h14" />
        </StrokeIcon>
      )
    default: {
      const exhaustive: never = name
      return exhaustive
    }
  }
}

export function Icon({ name }: { name: IconName }) {
  return <span className="svg">{renderIcon(name)}</span>
}
