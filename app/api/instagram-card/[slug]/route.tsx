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

interface Prices {
  gold:   { price: number | null; pct: number | null }
  crude:  { price: number | null; pct: number | null }
  silver: { price: number | null; pct: number | null }
}

async function fetchPrices(): Promise<Prices | null> {
  try {
    const r = await fetch('https://bhaavbrief.in/api/prices', { signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    const d = await r.json()
    return {
      gold:   { price: d.gold?.mcx   ?? null, pct: d.goldComexPct  ?? null },
      crude:  { price: d.crude?.mcx  ?? null, pct: d.crudePct      ?? null },
      silver: { price: d.silver?.mcx ?? null, pct: d.silverComexPct ?? null },
    }
  } catch { return null }
}

function fmt(n: number) { return Math.round(n).toLocaleString('en-IN') }
function pctStr(n: number) { return `${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(2)}%` }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const mdxPath = path.join(process.cwd(), 'content/briefs', `${slug}.mdx`)
  if (!fs.existsSync(mdxPath)) return new Response('Not found', { status: 404 })

  const { data } = matter(fs.readFileSync(mdxPath, 'utf8'))
  const title   = (data.title       ?? 'BhaavBrief') as string
  const desc    = (data.description ?? '')            as string
  const edition = data.edition      ?? ''
  const dateStr = data.date
    ? new Date(data.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const [font, prices] = await Promise.all([getPlayfairFont(), fetchPrices()])

  const cols = [
    { label: 'MCX GOLD',   d: prices?.gold   },
    { label: 'MCX CRUDE',  d: prices?.crude  },
    { label: 'MCX SILVER', d: prices?.silver },
  ]

  // Render at 2x resolution for crisp display on retina/high-DPI screens
  const S = 2

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column',
        width: '100%', height: '100%',
        backgroundColor: '#FAFAF6',
        padding: `${72*S}px ${88*S}px`,
        position: 'relative',
      }}>
        {/* Gold left accent bar */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: 10*S, height: '100%',
          backgroundColor: '#C8720A', display: 'flex',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18*S }}>
          <span style={{ color: '#C8720A', fontSize: 21*S, fontWeight: 700, letterSpacing: 4 }}>BHAAVBRIEF</span>
          <span style={{ color: '#8A8A7A', fontSize: 17*S }}>{dateStr}</span>
        </div>

        {/* Header divider */}
        <div style={{ height: S, backgroundColor: '#E0DFD5', marginBottom: 44*S, display: 'flex' }} />

        {/* Title */}
        <div style={{
          fontSize: (title.length > 65 ? 46 : title.length > 45 ? 52 : 58) * S,
          fontWeight: 700, color: '#18180F',
          lineHeight: 1.22, marginBottom: 28*S,
          fontFamily: font ? 'Playfair Display' : 'Georgia, serif',
          flex: '0 0 auto',
        }}>
          {title}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 25*S, color: '#48483A',
          lineHeight: 1.6, flex: 1,
        }}>
          {desc}
        </div>

        {/* Price strip */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28*S }}>
          <div style={{ height: S, backgroundColor: '#E0DFD5', marginBottom: 28*S, display: 'flex' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {cols.map(col => (
              <div key={col.label} style={{ display: 'flex', flexDirection: 'column', gap: 6*S }}>
                <span style={{ color: '#8A8A7A', fontSize: 15*S, fontWeight: 700, letterSpacing: 2 }}>
                  {col.label}
                </span>
                <span style={{ color: '#18180F', fontSize: 32*S, fontWeight: 700, lineHeight: 1 }}>
                  {col.d?.price != null ? `₹${fmt(col.d.price)}` : '—'}
                </span>
                <span style={{
                  color: col.d?.pct != null ? (col.d.pct >= 0 ? '#166534' : '#991818') : '#8A8A7A',
                  fontSize: 20*S,
                }}>
                  {col.d?.pct != null ? pctStr(col.d.pct) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ height: S, backgroundColor: '#E0DFD5', marginBottom: 24*S, display: 'flex' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#8A8A7A', fontSize: 17*S }}>Edition #{String(edition)}</span>
          <span style={{ color: '#C8720A', fontSize: 19*S, fontWeight: 700 }}>bhaavbrief.in</span>
        </div>
      </div>
    ),
    {
      width: 1080*S, height: 1080*S,
      fonts: font ? [{ name: 'Playfair Display', data: font, weight: 700, style: 'normal' }] : [],
    }
  )
}
