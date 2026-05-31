import { ImageResponse } from 'next/og'
import { NextRequest }   from 'next/server'

export const runtime = 'edge'

const GOLD  = '#C8720A'
const INK   = '#0E0D0A'
const CREAM = '#F0EBE0'
const DIM   = '#9A9080'
const RED   = '#7A2A2A'

/*
  Variants:
  ?v=h   — horizontal wordmark, cream bg  (600×180) [default]
  ?v=hd  — horizontal wordmark, dark bg   (600×180)
  ?v=sq  — square icon mark, dark bg      (400×400) — use for RRM, profile pics
*/

export async function GET(req: NextRequest) {
  const v = req.nextUrl.searchParams.get('v') ?? 'h'

  if (v === 'sq') return square()
  if (v === 'hd') return horizontal(true)
  return horizontal(false)
}

/* ─── Horizontal wordmark ─────────────────────────────────────────────────── */

function horizontal(dark: boolean) {
  const BG   = dark ? INK   : CREAM
  const TEXT = dark ? CREAM : INK
  const SUB  = dark ? '#7A7060' : '#9A9080'

  return new ImageResponse(
    (
      <div style={{
        width: 600, height: 180,
        background: BG,
        display: 'flex',
        alignItems: 'center',
        padding: '0 48px',
        gap: 28,
      }}>

        {/* OHLC candlestick mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 88 }}>

          {/* Candle 1 — prior bearish session */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 88, justifyContent: 'center' }}>
            <div style={{ width: 2, height: 10, background: DIM }} />
            <div style={{ width: 13, height: 32, background: RED, opacity: 0.8 }} />
            <div style={{ width: 2, height: 14, background: DIM }} />
          </div>

          {/* Candle 2 — indecision / doji */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 88, justifyContent: 'center' }}>
            <div style={{ width: 2, height: 20, background: DIM }} />
            <div style={{ width: 13, height: 8, background: DIM }} />
            <div style={{ width: 2, height: 20, background: DIM }} />
          </div>

          {/* Candle 3 — bullish reversal (gold, tallest) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 88, justifyContent: 'center' }}>
            <div style={{ width: 2, height: 8, background: GOLD }} />
            <div style={{ width: 13, height: 52, background: GOLD }} />
            <div style={{ width: 2, height: 6, background: GOLD }} />
          </div>

        </div>

        {/* Thin vertical rule */}
        <div style={{ width: 1, height: 64, background: dark ? '#3A3828' : '#DDDDD0', display: 'flex' }} />

        {/* Wordmark + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
            <span style={{
              fontFamily: 'serif',
              fontSize: 52,
              fontWeight: 700,
              color: TEXT,
              letterSpacing: '-1.5px',
              lineHeight: 1,
            }}>
              Bhaav
            </span>
            <span style={{
              fontFamily: 'serif',
              fontSize: 52,
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
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: SUB,
          }}>
            India's First Commodity Intelligence
          </span>
        </div>

      </div>
    ),
    { width: 600, height: 180 }
  )
}

/* ─── Square icon mark ────────────────────────────────────────────────────── */

function square() {
  return new ImageResponse(
    (
      <div style={{
        width: 400, height: 400,
        background: INK,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
      }}>

        {/* Three candles — larger, more dramatic */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

          {/* Candle 1 — bearish */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ width: 3, height: 18, background: '#5A4848' }} />
            <div style={{ width: 22, height: 54, background: RED, opacity: 0.75 }} />
            <div style={{ width: 3, height: 24, background: '#5A4848' }} />
          </div>

          {/* Candle 2 — doji */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ width: 3, height: 38, background: '#5A5448' }} />
            <div style={{ width: 22, height: 12, background: '#9A9080' }} />
            <div style={{ width: 3, height: 38, background: '#5A5448' }} />
          </div>

          {/* Candle 3 — bullish reversal */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ width: 3, height: 14, background: GOLD }} />
            <div style={{ width: 22, height: 90, background: GOLD }} />
            <div style={{ width: 3, height: 10, background: GOLD }} />
          </div>

        </div>

        {/* Wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{
              fontFamily: 'serif', fontSize: 56, fontWeight: 700,
              color: CREAM, letterSpacing: '-2px', lineHeight: 1,
            }}>
              Bhaav
            </span>
            <span style={{
              fontFamily: 'serif', fontSize: 56, fontWeight: 400,
              color: GOLD, letterSpacing: '-2px', lineHeight: 1,
            }}>
              Brief
            </span>
          </div>
          <span style={{
            fontFamily: 'monospace', fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#5A5448',
          }}>
            bhaavbrief.in
          </span>
        </div>

      </div>
    ),
    { width: 400, height: 400 }
  )
}
