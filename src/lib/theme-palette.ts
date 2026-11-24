import type { CSSProperties } from 'react'
import type { FlowLogo, InterfaceTheme } from '@/lib/interface-theme'

export const PALETTE_KEYS = ['background', 'surface', 'text', 'muted', 'accent', 'line'] as const

export type PaletteKey = (typeof PALETTE_KEYS)[number]

export type ThemePalette = Record<PaletteKey, string>

const HEX = /^#[0-9a-f]{6}$/

export function defaultPalette(theme: InterfaceTheme): ThemePalette {
  switch (theme) {
    case 'studio':
      return {
        background: '#ffffff',
        surface: '#ffffff',
        text: '#121217',
        muted: '#747586',
        accent: '#6843ff',
        line: '#e9e8ef',
      }
    case 'showroom':
      return {
        background: '#000000',
        surface: '#0a0a0a',
        text: '#ffffff',
        muted: '#9a9a9a',
        accent: '#ffffff',
        line: '#1a1a1a',
      }
    case 'minimalist':
      return {
        background: '#ffffff',
        surface: '#ffffff',
        text: '#111111',
        muted: '#737373',
        accent: '#111111',
        line: '#e2e2e2',
      }
    case 'high-tech':
      return {
        background: '#0b0b0c',
        surface: '#141416',
        text: '#f4f4f5',
        muted: '#8e8e93',
        accent: '#ff4d00',
        line: '#242428',
      }
    case 'institutional':
      return {
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#0f172a',
        muted: '#475569',
        accent: '#0f294a',
        line: '#cbd5e1',
      }
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}

export function paletteLabel(key: PaletteKey): string {
  switch (key) {
    case 'background':
      return 'Background'
    case 'surface':
      return 'Surface'
    case 'text':
      return 'Text'
    case 'muted':
      return 'Muted text'
    case 'accent':
      return 'Accent'
    case 'line':
      return 'Lines'
    default: {
      const unexpected: never = key
      return unexpected
    }
  }
}

export function readStoredPalette(value: unknown, theme: InterfaceTheme): Partial<ThemePalette> {
  if (!value || typeof value !== 'object') return {}
  const defaults = defaultPalette(theme)
  const record = value as Record<string, unknown>
  const next: Partial<ThemePalette> = {}
  for (const key of PALETTE_KEYS) {
    const color = record[key]
    if (typeof color !== 'string' || !HEX.test(color)) continue
    const normalized = color.toLowerCase()
    if (normalized === defaults[key]) continue
    next[key] = normalized
  }
  return next
}

export function paletteHasOverrides(theme: InterfaceTheme, palette: ThemePalette): boolean {
  const defaults = defaultPalette(theme)
  return PALETTE_KEYS.some((key) => palette[key].toLowerCase() !== defaults[key])
}

export function flowLogoForBackground(background: string): FlowLogo {
  return onAccent(background) === '#000000' ? 'black' : 'white'
}

export function suggestedFlowLogo(theme: InterfaceTheme, background: string): FlowLogo {
  switch (theme) {
    case 'institutional':
      return 'white'
    case 'studio':
    case 'showroom':
    case 'minimalist':
    case 'high-tech':
      return flowLogoForBackground(background)
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}

export function onAccent(hex: string): '#000000' | '#ffffff' {
  const normalized = hex.toLowerCase()
  if (!HEX.test(normalized)) return '#ffffff'
  const value = Number.parseInt(normalized.slice(1), 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return luminance > 160 ? '#000000' : '#ffffff'
}

function linearChannel(channel: number): number {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

export function contrastRatio(foreground: string, background: string): number {
  const value = Number.parseInt(foreground.slice(1), 16)
  const other = Number.parseInt(background.slice(1), 16)
  const foregroundLum =
    0.2126 * linearChannel((value >> 16) & 255) +
    0.7152 * linearChannel((value >> 8) & 255) +
    0.0722 * linearChannel(value & 255)
  const backgroundLum =
    0.2126 * linearChannel((other >> 16) & 255) +
    0.7152 * linearChannel((other >> 8) & 255) +
    0.0722 * linearChannel(other & 255)
  const lighter = Math.max(foregroundLum, backgroundLum)
  const darker = Math.min(foregroundLum, backgroundLum)
  return (lighter + 0.05) / (darker + 0.05)
}

function readable(color: string, surfaces: string[], minimum: number): string {
  const floors = surfaces.filter((surface) => HEX.test(surface))
  if (!HEX.test(color) || floors.length === 0) return color
  if (floors.every((surface) => contrastRatio(color, surface) >= minimum)) return color
  const black = Math.min(...floors.map((surface) => contrastRatio('#000000', surface)))
  const white = Math.min(...floors.map((surface) => contrastRatio('#ffffff', surface)))
  return black >= white ? '#000000' : '#ffffff'
}

export function resolvePalette(theme: InterfaceTheme, stored: Partial<ThemePalette> | null | undefined): ThemePalette {
  const palette = { ...defaultPalette(theme), ...readStoredPalette(stored, theme) }
  const surfaces = [palette.background, palette.surface]
  return {
    ...palette,
    text: readable(palette.text, surfaces, 4.5),
    muted: readable(palette.muted, surfaces, 3),
  }
}

export function paletteStyle(theme: InterfaceTheme, palette: ThemePalette): CSSProperties {
  const defaults = defaultPalette(theme)
  const surfaces = [palette.background, palette.surface]
  const text = readable(palette.text, surfaces, 4.5)
  const muted = readable(palette.muted, surfaces, 3)
  const style: Record<string, string> = {}
  if (palette.background !== defaults.background) style['--bg'] = palette.background
  if (palette.surface !== defaults.surface) {
    style['--surface'] = palette.surface
    style['--surface-soft'] = palette.surface
  }
  if (text !== defaults.text) style['--text'] = text
  if (muted !== defaults.muted) {
    style['--muted'] = muted
    style['--muted2'] = muted
  }
  if (palette.accent !== defaults.accent) {
    style['--flow'] = palette.accent
    style['--flow-dark'] = palette.accent
    style['--flow-soft'] = `color-mix(in srgb, ${palette.accent} 14%, transparent)`
    style['--on-accent'] = onAccent(palette.accent)
  }
  if (palette.line !== defaults.line) {
    style['--line'] = palette.line
    style['--line-dark'] = palette.line
  }
  if (Object.keys(style).length > 0 && !style['--on-accent']) style['--on-accent'] = onAccent(palette.accent)
  if (Object.keys(style).length > 0) {
    style['--on-text'] = onAccent(text)
    style['--flow-ink'] = readable(palette.accent, surfaces, 3)
  }
  return style
}
