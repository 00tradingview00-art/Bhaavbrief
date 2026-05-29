import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { LEARN_CARDS, type TableCard, type BulletCard } from '@/lib/learn-cards'

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

// Colours
const BG     = '#0F0E0A'
const GOLD   = '#C8720A'
const CREAM  = '#F0EBE0'
const DIM    = '#9A9080'
const MUTED  = '#5A5448'
const WHITE  = '#FFFFFF'

function TableContent({ card }: { card: TableCard }) {
  const colCount = card.headers.length
  // Column flex weights: first col wider
  const weights = colCount === 3
    ? ['2.2', '1.5', '1.5']
    : ['2.0', '1.0', '1.5', '1.2']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
      {/* Header row */}
      <div style={{
        display: 'flex', flexDirection: 'row',
        borderBottom: `1px solid ${MUTED}`,
        paddingBottom: 14, marginBottom: 6,
      }}>
        {card.headers.map((h, i) => (
          <div key={h} style={{
            flex: weights[i] ?? '1',
            fontSize: 20, fontWeight: 700,
            color: GOLD, letterSpacing: 1.5,
            textAlign: i === 0 ? 'left' : 'right',
            display: 'flex',
            justifyContent: i === 0 ? 'flex-start' : 'flex-end',
          }}>
            {h}
          </div>
        ))}
      </div>

      {/* Data rows */}
      {card.rows.map((row, ri) => (
        <div key={ri} style={{
          display: 'flex', flexDirection: 'row',
          paddingTop: 18, paddingBottom: 18,
          borderBottom: `1px solid ${ri < card.rows.length - 1 ? '#2A2820' : 'transparent'}`,
        }}>
          {row.map((cell, ci) => (
            <div key={ci} style={{
              flex: weights[ci] ?? '1',
              fontSize: ci === 0 ? 26 : 24,
              fontWeight: ci === 0 ? 600 : 400,
              color: ci === 0 ? CREAM : WHITE,
              display: 'flex',
              justifyContent: ci === 0 ? 'flex-start' : 'flex-end',
              textAlign: ci === 0 ? 'left' : 'right',
              lineHeight: 1.3,
            }}>
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function BulletContent({ card }: { card: BulletCard }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
      {card.bullets.map((b, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 20 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            backgroundColor: GOLD, marginTop: 10, flexShrink: 0, display: 'flex',
          }} />
          <div style={{ fontSize: 28, color: CREAM, lineHeight: 1.45, flex: 1, display: 'flex' }}>
            {b}
          </div>
        </div>
      ))}
    </div>
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ topic: string }> }
) {
  const { topic } = await params
  const card = LEARN_CARDS[topic]
  if (!card) return new Response('Not found', { status: 404 })

  const font = await getPlayfairFont()

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'row',
        width: '100%', height: '100%',
        backgroundColor: BG,
        position: 'relative',
        fontFamily: 'system-ui, sans-serif',
      }}>
        {/* Left gold bar */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: 8, height: '100%',
          backgroundColor: GOLD, display: 'flex',
        }} />

        {/* Main content column */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          paddingLeft: 60, paddingRight: 54,
          paddingTop: 72, paddingBottom: 64,
          flex: 1,
        }}>

          {/* Top header: BHAAVBRIEF + LEARN badge */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ color: GOLD, fontSize: 26, fontWeight: 700, letterSpacing: 4 }}>BHAAVBRIEF</span>
            <span style={{
              color: BG, backgroundColor: GOLD,
              fontSize: 18, fontWeight: 700, letterSpacing: 3,
              paddingLeft: 14, paddingRight: 14, paddingTop: 5, paddingBottom: 5,
              display: 'flex',
            }}>
              LEARN
            </span>
          </div>

          {/* Section + card number row */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <span style={{ color: DIM, fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>{card.section}</span>
            <span style={{ color: MUTED, fontSize: 18, letterSpacing: 1 }}>{card.cardNum}</span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: MUTED, marginBottom: 36, display: 'flex' }} />

          {/* Title */}
          <div style={{
            fontSize: card.title.length > 28 ? 52 : 60,
            fontWeight: 700, color: CREAM,
            lineHeight: 1.2, marginBottom: 16,
            fontFamily: font ? 'Playfair Display' : 'Georgia, serif',
            display: 'flex',
          }}>
            {card.title}
          </div>

          {/* Subtitle */}
          {card.subtitle && (
            <div style={{ fontSize: 24, color: DIM, marginBottom: 40, letterSpacing: 0.5, display: 'flex' }}>
              {card.subtitle}
            </div>
          )}

          {/* Content */}
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', marginBottom: 32 }}>
            {card.type === 'table'
              ? <TableContent card={card} />
              : <BulletContent card={card} />
            }
          </div>

          {/* Note */}
          {card.note && (
            <div style={{
              fontSize: 20, color: MUTED, lineHeight: 1.5,
              borderTop: `1px solid #2A2820`,
              paddingTop: 20, marginBottom: 24,
              display: 'flex',
            }}>
              {card.note}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: MUTED, fontSize: 20 }}>bhaavbrief.in/learn</span>
            <span style={{ color: DIM, fontSize: 20 }}>Swipe to learn →</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080, height: 1920,
      fonts: font ? [{ name: 'Playfair Display', data: font, weight: 700, style: 'normal' }] : [],
    }
  )
}
