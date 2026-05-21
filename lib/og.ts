// Shared helpers for OG image generation
import { readFile } from 'fs/promises'
import path from 'path'

export const OG_SIZE = { width: 1200, height: 630 }

// Loads Inter Bold TTF from the bundled public/fonts file.
// Satori requires TTF/OTF — woff/woff2 are not supported.
export async function loadFont(): Promise<{ data: ArrayBuffer; name: string }> {
  const ttfPath = path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf')
  const data = await readFile(ttfPath)
  return { data: data.buffer as ArrayBuffer, name: 'Inter' }
}

// Legacy alias kept for compatibility
export async function loadPlayfair(): Promise<ArrayBuffer | null> {
  const FONTS = [
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap',
    'https://fonts.googleapis.com/css2?family=Merriweather:wght@700&display=swap',
    'https://fonts.googleapis.com/css2?family=Noto+Serif:wght@700&display=swap',
  ]
  // Handles both  url(https://...)  and  url('https://...')
  const URL_RE = /url\(['"]?(https:\/\/fonts\.gstatic\.com[^'")\s]+\.woff2)['"]?\)/

  for (const endpoint of FONTS) {
    try {
      const css = await fetch(endpoint, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }).then(r => r.text())
      const fontUrl = URL_RE.exec(css)?.[1]
      if (!fontUrl) continue
      const data = await fetch(fontUrl).then(r => r.arrayBuffer())
      return data
    } catch {
      continue
    }
  }
  return null
}

export function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

// Shared colours — no CSS variables in ImageResponse
export const C = {
  bg:      '#0E0D0A',
  bgCard:  '#18180F',
  rule:    '#2A2A24',
  gold:    '#B5862A',
  goldPale:'rgba(181,134,42,0.12)',
  ink:     '#FAFAF7',
  ink2:    '#B8B4A8',
  ink3:    '#7A7668',
  ink4:    '#48483A',
}
