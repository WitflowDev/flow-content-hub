import type { CSSProperties } from 'react'
import type { InterfaceTheme } from '@/lib/interface-theme'

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

export function resolvePalette(theme: InterfaceTheme, stored: Partial<ThemePalette> | null | undefined): ThemePalette {
  return { ...defaultPalette(theme), ...readStoredPalette(stored, theme) }
}

export function paletteHasOverrides(theme: InterfaceTheme, palette: ThemePalette): boolean {
  const defaults = defaultPalette(theme)
  return PALETTE_KEYS.some((key) => palette[key].toLowerCase() !== defaults[key])
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

export function paletteStyle(theme: InterfaceTheme, palette: ThemePalette): CSSProperties {
  const defaults = defaultPalette(theme)
  const style: Record<string, string> = {}
  if (palette.background !== defaults.background) style['--bg'] = palette.background
  if (palette.surface !== defaults.surface) {
    style['--surface'] = palette.surface
    style['--surface-soft'] = palette.surface
  }
  if (palette.text !== defaults.text) style['--text'] = palette.text
  if (palette.muted !== defaults.muted) {
    style['--muted'] = palette.muted
    style['--muted2'] = palette.muted
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
  return style
}
