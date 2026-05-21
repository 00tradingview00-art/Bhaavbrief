// Shared helpers for OG image generation

export const OG_SIZE = { width: 1200, height: 630 }

// Always resolves — falls back to Inter if Playfair fails
export async function loadFont(): Promise<{ data: ArrayBuffer; name: string }> {
  const CANDIDATES = [
    { url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap', name: 'Playfair' },
    { url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@700&display=swap',     name: 'Merriweather' },
    { url: 'https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap',            name: 'Inter' },
  ]
  const URL_RE = /url\(['"]?(https:\/\/fonts\.gstatic\.com[^'")\s]+\.woff2)['"]?\)/
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  for (const { url, name } of CANDIDATES) {
    try {
      const css     = await fetch(url, { headers: { 'User-Agent': UA } }).then(r => r.text())
      const fontUrl = URL_RE.exec(css)?.[1]
      if (!fontUrl) continue
      const data = await fetch(fontUrl).then(r => r.arrayBuffer())
      return { data, name }
    } catch { continue }
  }
  throw new Error('All font sources failed')
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
