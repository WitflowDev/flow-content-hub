import type { InterfaceTheme } from '@/lib/interface-theme'
import { defaultPalette, type ThemePalette } from '@/lib/theme-palette'

type Rgb = { r: number; g: number; b: number; count: number }

export function paletteFromImage(src: string, theme: InterfaceTheme): Promise<ThemePalette | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(readPalette(image, theme))
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function readPalette(image: HTMLImageElement, theme: InterfaceTheme): ThemePalette | null {
  const size = 40
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.clearRect(0, 0, size, size)
  context.drawImage(image, 0, 0, size, size)
  let pixels: Uint8ClampedArray
  try {
    pixels = context.getImageData(0, 0, size, size).data
  } catch {
    return null
  }
  const buckets = new Map<string, Rgb>()
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] ?? 0
    if (alpha < 180) continue
    const red = (pixels[index] ?? 0) & 0xf0
    const green = (pixels[index + 1] ?? 0) & 0xf0
    const blue = (pixels[index + 2] ?? 0) & 0xf0
    const key = `${red},${green},${blue}`
    const current = buckets.get(key)
    if (current) current.count += 1
    else buckets.set(key, { r: red, g: green, b: blue, count: 1 })
  }
  const colors = [...buckets.values()].filter((color) => color.count >= 2)
  if (colors.length === 0) return null
  return assignPalette(theme, colors)
}

function assignPalette(theme: InterfaceTheme, colors: Rgb[]): ThemePalette {
  const base = defaultPalette(theme)
  const accent = [...colors].sort((left, right) => saturation(right) - saturation(left)).find((color) => saturation(color) > 0.28)
  switch (theme) {
    case 'studio':
    case 'minimalist':
    case 'institutional': {
      const light = [...colors].sort((left, right) => luminance(right) - luminance(left)).find((color) => luminance(color) > 210)
      const dark = [...colors].sort((left, right) => luminance(left) - luminance(right)).find((color) => luminance(color) < 80)
      const muted = colors.find((color) => {
        const tone = luminance(color)
        return tone > 90 && tone < 170 && saturation(color) < 0.35
      })
      return {
        background: light ? hex(light) : base.background,
        surface: light ? hex(light) : base.surface,
        text: dark ? hex(dark) : base.text,
        muted: muted ? hex(muted) : base.muted,
        accent: accent ? hex(accent) : base.accent,
        line: base.line,
      }
    }
    case 'showroom':
    case 'high-tech': {
      const darks = colors.filter((color) => luminance(color) < 50).sort((left, right) => luminance(left) - luminance(right))
      const light = [...colors].sort((left, right) => luminance(right) - luminance(left)).find((color) => luminance(color) > 190)
      const muted = colors.find((color) => {
        const tone = luminance(color)
        return tone > 100 && tone < 180
      })
      return {
        background: darks[0] ? hex(darks[0]) : base.background,
        surface: darks[1] ? hex(darks[1]) : darks[0] ? hex(darks[0]) : base.surface,
        text: light ? hex(light) : base.text,
        muted: muted ? hex(muted) : base.muted,
        accent: accent ? hex(accent) : base.accent,
        line: base.line,
      }
    }
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}

function hex(color: Rgb): string {
  return `#${[color.r, color.g, color.b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function luminance(color: Rgb): number {
  return (color.r * 299 + color.g * 587 + color.b * 114) / 1000
}

function saturation(color: Rgb): number {
  const max = Math.max(color.r, color.g, color.b)
  const min = Math.min(color.r, color.g, color.b)
  if (max === 0) return 0
  return (max - min) / max
}
