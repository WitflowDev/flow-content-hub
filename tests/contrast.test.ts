import { expect, test } from 'vitest'
import { INTERFACE_THEMES } from '@/lib/interface-theme'
import { contrastRatio, resolvePalette } from '@/lib/theme-palette'

const clashes = [
  { background: '#ffffff', surface: '#ffffff', text: '#ffffff', muted: '#ffffff' },
  { background: '#0b0b0c', surface: '#141416', text: '#0b0b0c', muted: '#141416' },
  { background: '#111111', surface: '#111111', text: '#222222', muted: '#333333' },
]

test('resolved text stays at least 4.5 against the background and the surface', () => {
  for (const theme of INTERFACE_THEMES) {
    const samples = [resolvePalette(theme, null), ...clashes.map((stored) => resolvePalette(theme, stored))]
    for (const palette of samples) {
      expect(contrastRatio(palette.text, palette.background)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(palette.text, palette.surface)).toBeGreaterThanOrEqual(4.5)
    }
  }
})
