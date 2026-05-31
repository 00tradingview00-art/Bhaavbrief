import { ImageResponse } from 'next/og'
import { NextRequest }   from 'next/server'

export const runtime = 'edge'

const GOLD  = '#C8720A'
const INK   = '#0E0D0A'
const CREAM = '#F0EBE0'
const MUTED = '#8A8070'

/*
  Variants via ?v=
  h   — horizontal wordmark, cream bg  (640×160) [default, general use]
  hd  — horizontal wordmark, dark bg   (640×160)
  sq  — square B mark, dark bg         (400×400) — RRM, social profiles
  sm  — compact B mark, dark bg        (200×200) — smaller profile pics
*/

export async function GET(req: NextRequest) {
  const v = req.nextUrl.searchParams.get('v') ?? 'h'
  if (v === 'sq') return squareMark(400)
  if (v === 'sm') return squareMark(200)
  if (v === 'hd') return wordmark(true)
  return wordmark(false)
}

/* ─── B monogram mark ─────────────────────────────────────────────────────── */

function squareMark(size: number) {
  const border  = Math.round(size * 0.028)   // ~11px at 400
  const inset   = Math.round(size * 0.05)    // ~20px at 400
  const bSize   = Math.round(size * 0.62)    // ~248px at 400
  const tagSize = Math.round(size * 0.048)   // ~19px at 400

  return new ImageResponse(
    (
      <div style={{
        width: size, height: size,
        background: INK,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `${border}px solid ${GOLD}`,
      }}>
        {/* Inner hairline frame */}
        <div style={{
          width: size - inset * 2,
          height: size - inset * 2,
          border: `0.5px solid rgba(200,114,10,0.25)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 0,
        }}>
          {/* The B */}
          <span style={{
            fontFamily: 'serif',
            fontSize: bSize,
            fontWeight: 700,
            color: GOLD,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            marginTop: Math.round(size * 0.04),
          }}>
            B
          </span>
          {/* Thin gold rule */}
          <div style={{
            width: Math.round(size * 0.22),
            height: 1,
            background: `rgba(200,114,10,0.4)`,
            marginTop: Math.round(size * -0.04),
            display: 'flex',
          }} />
          {/* Sub-text */}
          <span style={{
            fontFamily: 'monospace',
            fontSize: tagSize,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(200,114,10,0.55)',
            marginTop: Math.round(size * 0.025),
          }}>
            BHAAVBRIEF
          </span>
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}

/* ─── Horizontal wordmark ─────────────────────────────────────────────────── */

function wordmark(dark: boolean) {
  const BG   = dark ? INK   : CREAM
  const TEXT = dark ? CREAM : INK
  const RULE = dark ? 'rgba(200,114,10,0.2)' : 'rgba(14,13,10,0.12)'

  return new ImageResponse(
    (
      <div style={{
        width: 640, height: 160,
        background: BG,
        display: 'flex',
        alignItems: 'center',
        padding: '0 44px',
        gap: 32,
      }}>

        {/* B mark — compact */}
        <div style={{
          width: 72, height: 80,
          background: dark ? 'rgba(200,114,10,0.08)' : INK,
          border: `1.5px solid ${GOLD}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'serif',
            fontSize: 52,
            fontWeight: 700,
            color: GOLD,
            lineHeight: 1,
            marginTop: 2,
          }}>
            B
          </span>
        </div>

        {/* Vertical rule */}
        <div style={{
          width: 1,
          height: 56,
          background: RULE,
          display: 'flex',
          flexShrink: 0,
        }} />

        {/* Wordmark + tagline */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, lineHeight: 1 }}>
            <span style={{
              fontFamily: 'serif',
              fontSize: 54,
              fontWeight: 700,
              color: TEXT,
              letterSpacing: '-1.5px',
              lineHeight: 1,
            }}>
              Bhaav
            </span>
            <span style={{
              fontFamily: 'serif',
              fontSize: 54,
              fontWeight: 400,
              color: GOLD,
              letterSpacing: '-1.5px',
              lineHeight: 1,
            }}>
              Brief
            </span>
          </div>
          <span style={{
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: MUTED,
          }}>
            India's First Commodity Intelligence
          </span>
        </div>

      </div>
    ),
    { width: 640, height: 160 }
  )
}
