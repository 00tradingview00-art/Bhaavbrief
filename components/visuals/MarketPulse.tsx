'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { PriceData } from '@/lib/prices'
import { getMarketPulse, marketPulseSummary, type MarketPulseItem } from '@/lib/marketPulse'
import { trackEvent } from '@/lib/analytics'

type Props = {
  prices: PriceData | null
  location: 'mobile' | 'markets'
  compact?: boolean
}

function percent(value: number) {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}%`
}

function direction(item: MarketPulseItem) {
  if (item.tone === 'up') return '▲'
  if (item.tone === 'down') return '▼'
  return '•'
}

function trackOpen(name: 'visual_insight_opened' | 'market_pulse_commodity_opened', item: MarketPulseItem, location: Props['location'], timestamp: string | null) {
  trackEvent(name, {
    page: location,
    component: 'market_pulse',
    commodity: item.key,
    source_data_timestamp: timestamp ?? undefined,
    stale_data: item.stale,
  })
}

export default function MarketPulse({ prices, location, compact = false }: Props) {
  const pulse = getMarketPulse(prices)
  const trackedTimestamp = useRef<string | null>(null)
  const visibleItems = pulse.items.slice(0, compact ? 3 : 5)
  const max = Math.max(...visibleItems.map(item => Math.abs(item.changePct)), 1)
  const summary = marketPulseSummary(pulse.lead)

  useEffect(() => {
    if (!pulse.timestamp || trackedTimestamp.current === pulse.timestamp) return
    trackedTimestamp.current = pulse.timestamp
    trackEvent('visual_insight_viewed', {
      page: location,
      component: 'market_pulse',
      source_data_timestamp: pulse.timestamp,
      stale_data: Boolean(prices?.snapshotStale),
    })
  }, [location, prices?.snapshotStale, pulse.timestamp])

  if (!visibleItems.length) return null

  return (
    <section aria-labelledby={`market-pulse-${location}`} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '18px 16px', marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div>
          <p style={{ color: 'var(--gold)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', margin: '0 0 4px', textTransform: 'uppercase' }}>Visual market read</p>
          <h2 id={`market-pulse-${location}`} style={{ color: 'var(--ink)', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, margin: 0 }}>Market Pulse</h2>
        </div>
        <span style={{ color: prices?.snapshotStale ? '#C87000' : 'var(--ink-4)', fontSize: 10, textAlign: 'right' }}>
          {pulse.timestamp ? `Updated ${pulse.timestamp.replace(/^.*?\s(\d{2}:\d{2}).*$/, '$1 IST')}` : 'Awaiting data'}
        </span>
      </div>

      <div role="list" aria-label="MCX commodity moves" style={{ display: 'grid', gap: 10 }}>
        {visibleItems.map(item => {
          const width = `${Math.max(4, (Math.abs(item.changePct) / max) * 100)}%`
          const colour = item.stale ? 'var(--ink-4)' : item.tone === 'up' ? 'var(--up)' : item.tone === 'down' ? 'var(--down)' : 'var(--ink-3)'
          const left = item.changePct < 0
          return (
            <Link key={item.key} href={item.href} role="listitem" onClick={() => trackOpen('market_pulse_commodity_opened', item, location, pulse.timestamp)} style={{ color: 'inherit', display: 'grid', gridTemplateColumns: '92px 1fr 58px', alignItems: 'center', gap: 9, minHeight: 32, opacity: item.stale ? 0.62 : 1, textDecoration: 'none' }}>
              <span style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              <span aria-label={`${item.label} ${percent(item.changePct)}`} style={{ background: 'var(--surface-2)', display: 'flex', height: 8, overflow: 'hidden', position: 'relative' }}>
                <span style={{ background: 'var(--border)', height: '100%', left: '50%', position: 'absolute', width: 1 }} />
                <span style={{ alignSelf: 'center', background: colour, height: 6, marginLeft: left ? `${50 - Number.parseFloat(width) / 2}%` : '50%', width: `calc(${width} / 2)` }} />
              </span>
              <span style={{ color: colour, fontSize: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{direction(item)} {percent(item.changePct)}</span>
              {item.stale && <span style={{ color: 'var(--ink-4)', fontSize: 9, gridColumn: '2 / 4', marginTop: -8 }}>Delayed</span>}
            </Link>
          )
        })}
      </div>

      {summary && pulse.lead && (
        <div style={{ borderTop: '1px solid var(--border)', color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.55, marginTop: 16, paddingTop: 14 }}>
          <strong style={{ color: 'var(--ink)' }}>{summary}</strong> Explore its current market context and the data behind it.
          <Link href={pulse.lead.href} onClick={() => trackOpen('visual_insight_opened', pulse.lead!, location, pulse.timestamp)} style={{ color: 'var(--gold)', display: 'inline-block', fontWeight: 700, marginLeft: 6, textDecoration: 'none' }}>See {pulse.lead.label} →</Link>
        </div>
      )}
    </section>
  )
}
