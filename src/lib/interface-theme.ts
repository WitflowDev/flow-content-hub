export const INTERFACE_THEMES = ['studio', 'showroom', 'minimalist', 'high-tech', 'institutional'] as const

export type InterfaceTheme = (typeof INTERFACE_THEMES)[number]

export type FlowLogo = 'black' | 'white'

export function parseInterfaceTheme(value: unknown): InterfaceTheme {
  switch (value) {
    case 'showroom':
      return 'showroom'
    case 'minimalist':
      return 'minimalist'
    case 'high-tech':
      return 'high-tech'
    case 'institutional':
      return 'institutional'
    case 'studio':
      return 'studio'
    default:
      return 'studio'
  }
}

export function readInterfaceTheme(value: string): InterfaceTheme | null {
  switch (value) {
    case 'showroom':
    case 'minimalist':
    case 'high-tech':
    case 'institutional':
    case 'studio':
      return value
    default:
      return null
  }
}

export function themeClassName(theme: InterfaceTheme): string {
  switch (theme) {
    case 'studio':
      return ''
    case 'showroom':
      return 'theme-showroom'
    case 'minimalist':
      return 'theme-minimalist'
    case 'high-tech':
      return 'theme-high-tech'
    case 'institutional':
      return 'theme-institutional'
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}

export function readFlowLogo(value: unknown): FlowLogo | null {
  switch (value) {
    case 'black':
    case 'white':
      return value
    default:
      return null
  }
}

export function flowLogoTheme(logo: FlowLogo): 'dark' | 'light' {
  switch (logo) {
    case 'black':
      return 'dark'
    case 'white':
      return 'light'
    default: {
      const unexpected: never = logo
      return unexpected
    }
  }
}

export function usesLightLogo(theme: InterfaceTheme): boolean {
  switch (theme) {
    case 'showroom':
    case 'high-tech':
    case 'institutional':
      return true
    case 'minimalist':
    case 'studio':
      return false
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}

export function isShowroomTheme(theme: InterfaceTheme): boolean {
  switch (theme) {
    case 'showroom':
      return true
    case 'minimalist':
    case 'high-tech':
    case 'institutional':
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
    case 'minimalist':
      return 'Minimalist'
    case 'high-tech':
      return 'High Tech'
    case 'institutional':
      return 'Institutional'
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}
