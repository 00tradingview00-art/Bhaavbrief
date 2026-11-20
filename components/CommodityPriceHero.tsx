'use client'

import { useEffect, useRef, useState } from 'react'
import type { MCXData, PriceData } from '@/lib/prices'
import { isWithinMcxHours } from '@/scripts/lib/mcxHours.js'
import SinceLastVisit from '@/components/SinceLastVisit'
import WatchlistStar from '@/components/terminal/WatchlistStar'

function fmt(n: number, decimals = 0): string {
  if (!n || n === 0) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function pctBadge(pct: number) {
  const up    = pct >= 0
  const color = up ? '#16A34A' : '#DC2626'
  const bg    = up ? '#F0FDF4' : '#FEF2F2'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 14, fontWeight: 600, color,
      background: bg, padding: '2px 8px', borderRadius: 4,
    }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
    </span>
  )
}

interface Props {
  slug:     string   // /commodities/{slug} — also the lastSeenPrices key
  priceKey: string   // indexes into PriceData's MCX* fields, e.g. 'gold' — see CommodityPriceKey in the page
  initialPriceData:     MCXData | null
  initialSnapshotStale: boolean
  color:    string
  mcxSymbol: string
  unit:     string
  name:     string
}

// Mirrors CommodityTerminalGrid.tsx's pattern: SSR snapshot for instant paint,
// then a client poll of /api/prices (same endpoint, same 30s/5min cadence as
// TickerStrip/MarketsClient/DailyBriefHome) corrects it. Only the raw
// price/OHLC/stale fields are live-corrected here — the duty-inclusive import
// parity block on the page stays server-computed (lib/importDuty.ts reads a
// JSON file via fs, not available client-side, and is a slower-moving derived
// metric, not a tick price — out of scope, see the plan).
export default function CommodityPriceHero({
  slug, priceKey, initialPriceData, initialSnapshotStale, color, mcxSymbol, unit, name,
}: Props) {
  const [priceData, setPriceData]         = useState<MCXData | null>(initialPriceData)
  const [snapshotStale, setSnapshotStale] = useState(initialSnapshotStale)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/prices', { cache: 'no-store' })
        if (!res.ok) return
        const d = await res.json() as PriceData
        const next = (d as unknown as Record<string, MCXData>)[priceKey] ?? null
        setPriceData(next)
        setSnapshotStale(d.snapshotStale ?? false)
      } catch {
        // Keep current values — don't replace live data with nothing
      }
    }

    function scheduleNext() {
      const delay = isWithinMcxHours() ? 30_000 : 300_000
      intervalRef.current = setTimeout(async () => {
        await load()
        scheduleNext()
      }, delay)
    }

    load()
    scheduleNext()
    return () => clearTimeout(intervalRef.current)
  }, [priceKey])

  const ltp       = priceData?.mcx          ?? 0
  const pct       = priceData?.mcxChangePct ?? 0
  const open      = priceData?.mcxOpen      ?? 0
  const high      = priceData?.mcxHigh      ?? 0
  const low       = priceData?.mcxLow       ?? 0
  const prevClose = priceData?.mcxPrevClose ?? 0
  const isStale   = (priceData?.mcxStale ?? false) || snapshotStale

  return (
    <div className="commodity-price-summary" style={{
      background: 'var(--surface-1)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '28px 32px', marginBottom: 32,
      borderTop: `3px solid ${color}`,
    }}>
      <div className="bb-commodity-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
              padding: '3px 8px', borderRadius: 4, background: `${color}15`, color,
            }}>MCX</span>
            <span style={{ fontSize: 15, color: 'var(--ink-4)' }}>{mcxSymbol}</span>
            <span style={{ fontSize: 15, color: 'var(--ink-4)' }}>·</span>
            <span style={{ fontSize: 15, color: 'var(--ink-4)' }}>{unit}</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500,
            color: 'var(--ink)', margin: '0 0 4px', lineHeight: 1.2,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            MCX {name} Price Today
            <WatchlistStar instrumentKey={slug} />
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-4)', margin: 0 }}>
            {isStale ? 'Last known MCX price · live update unavailable' : 'Live MCX price · Updated in real time'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 36, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-1px' }}>
            {ltp > 0 ? `₹${fmt(ltp)}` : '—'}
          </div>
          <div style={{ marginTop: 6 }}>
            {isStale ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 600,
                color: 'var(--ink-4)', background: 'var(--surface-2, #F3F2EC)', padding: '2px 8px', borderRadius: 4,
              }}>last known</span>
            ) : (pct !== 0 ? pctBadge(pct) : null)}
          </div>
        </div>
      </div>

      <SinceLastVisit slug={slug} price={ltp} isStale={isStale} />

      {/* OHLC strip */}
      {(open > 0 || high > 0) && (
        <div className="bb-commodity-ohlc" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12, marginTop: 24,
          padding: '16px 0 0', borderTop: '1px solid var(--border)',
        }}>
          {[
            { label: 'Open',       value: fmt(open) },
            { label: 'High',       value: fmt(high) },
            { label: 'Low',        value: fmt(low)  },
            { label: 'Prev Close', value: fmt(prevClose) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 16, color: 'var(--ink-2)', fontWeight: 500 }}>
                ₹{value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
