import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let playfairFontCache: ArrayBuffer | null = null

async function getPlayfairFont(): Promise<ArrayBuffer | null> {
  if (playfairFontCache) return playfairFontCache
  try {
    // Request TTF format via Android User-Agent
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700',
      { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 9; Pixel 3)' } }
    ).then(r => r.text())
    const url = css.match(/url\((https:\/\/[^)]+)\)/)?.[1]
    if (!url) return null
    playfairFontCache = await fetch(url).then(r => r.arrayBuffer())
    return playfairFontCache
  } catch { return null }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const mdxPath = path.join(process.cwd(), 'content/briefs', `${slug}.mdx`)
  if (!fs.existsSync(mdxPath)) {
    return new Response('Not found', { status: 404 })
  }

  const { data } = matter(fs.readFileSync(mdxPath, 'utf8'))
  const title   = (data.title       ?? 'BhaavBrief') as string
  const desc    = (data.description ?? '')            as string
  const edition = data.edition      ?? ''
  const dateStr = data.date
    ? new Date(data.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const font = await getPlayfairFont()

  return new ImageResponse(
    (
      <div
        style={{
          display:         'flex',
          flexDirection:   'column',
          width:           '100%',
          height:          '100%',
          backgroundColor: '#FAFAF6',
          padding:         '80px 88px',
          position:        'relative',
        }}
      >
        {/* Gold left accent bar */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: 10, height: '100%',
          backgroundColor: '#C8720A',
          display: 'flex',
        }} />

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ color: '#C8720A', fontSize: 22, fontWeight: 700, letterSpacing: 4 }}>
            BHAAVBRIEF
          </span>
          <span style={{ color: '#8A8A7A', fontSize: 18 }}>
            {dateStr}
          </span>
        </div>

        {/* Header divider */}
        <div style={{ height: 1, backgroundColor: '#E0DFD5', marginBottom: 52, display: 'flex' }} />

        {/* Title */}
        <div
          style={{
            fontSize:    title.length > 60 ? 50 : 58,
            fontWeight:  700,
            color:       '#18180F',
            lineHeight:  1.25,
            marginBottom: 32,
            fontFamily:  font ? 'Playfair Display' : 'Georgia, serif',
            flex:        '0 0 auto',
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize:  26,
            color:     '#48483A',
            lineHeight: 1.65,
            flex:       1,
          }}
        >
          {desc}
        </div>

        {/* Footer divider */}
        <div style={{ height: 1, backgroundColor: '#E0DFD5', marginBottom: 28, display: 'flex' }} />

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#8A8A7A', fontSize: 18 }}>
            Edition #{String(edition)}
          </span>
          <span style={{ color: '#C8720A', fontSize: 20, fontWeight: 700 }}>
            bhaavbrief.in
          </span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: font
        ? [{ name: 'Playfair Display', data: font, weight: 700, style: 'normal' }]
        : [],
    }
  )
}
