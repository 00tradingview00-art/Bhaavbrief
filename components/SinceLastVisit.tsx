'use client'

import { useEffect, useState } from 'react'
import { getSinceLastVisit, type SinceLastVisit as SinceLastVisitResult } from '@/lib/lastSeenPrices'

function fmtINR(v: number): string {
  return `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`
}

function relativeTime(ts: number, now: number): string {
  const mins = Math.round((now - ts) / 60000)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

interface Props {
  slug: string
  price: number
  isStale: boolean
}

// Shows a visitor how the price has moved since the last time THEY looked —
// distinct from the page's own OHLC/prev-close, which is since today's open.
// Purely a local convenience (localStorage), same as WatchlistStar/
// CommodityVisitTracker — never fabricates a price, never compares against
// a stale/carried-forward one.
export default function SinceLastVisit({ slug, price, isStale }: Props) {
  const [result, setResult] = useState<SinceLastVisitResult | null>(null)

  useEffect(() => {
    if (isStale || !(price > 0)) return
    setResult(getSinceLastVisit(slug, price))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  if (!result) return null

  const up = result.delta >= 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      marginTop: 12, padding: '8px 14px', borderRadius: 6,
      background: up ? 'var(--up-bg)' : 'var(--down-bg)',
      fontSize: 13,
    }}>
      <span style={{ color: 'var(--ink-3)' }}>
        Since your last visit ({relativeTime(result.previousTs, Date.now())}):
      </span>
      <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
        ₹{Math.round(result.previousPrice).toLocaleString('en-IN')} → ₹{Math.round(price).toLocaleString('en-IN')}
      </span>
      <span style={{ fontWeight: 600, color: up ? 'var(--up)' : 'var(--down)' }}>
        {up ? '+' : '-'}{fmtINR(result.delta)} · {up ? '+' : ''}{result.deltaPct.toFixed(2)}%
      </span>
    </div>
  )
}
