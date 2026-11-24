export const INTERFACE_THEMES = ['studio', 'showroom'] as const

export type InterfaceTheme = (typeof INTERFACE_THEMES)[number]

export function parseInterfaceTheme(value: unknown): InterfaceTheme {
  switch (value) {
    case 'showroom':
      return 'showroom'
    case 'studio':
      return 'studio'
    default:
      return 'studio'
  }
}

export function readInterfaceTheme(value: string): InterfaceTheme | null {
  switch (value) {
    case 'showroom':
    case 'studio':
      return value
    default:
      return null
  }
}

export function isShowroomTheme(theme: InterfaceTheme): boolean {
  switch (theme) {
    case 'showroom':
      return true
    case 'studio':
      return false
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}
export function interfaceThemeLabel(theme: InterfaceTheme): string {
  switch (theme) {
    case 'studio':
      return 'Studio'
    case 'showroom':
      return 'Showroom'
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}
