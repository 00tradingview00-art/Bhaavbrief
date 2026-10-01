'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { PriceData } from '@/lib/prices'
import { DRIVER_MAPS_COPY, getDriverMaps, type DriverMap, type DriverReading } from '@/lib/driverMaps'
import { formatPulseTime } from '@/lib/marketPulse'
import { trackEvent } from '@/lib/analytics'
import { useIsPro } from '@/lib/useIsPro'

function toneColour(reading: DriverReading, stale = false) {
  if (stale || reading.changePct === null) return 'var(--ink-4)'
  return reading.tone === 'up' ? 'var(--up)' : reading.tone === 'down' ? 'var(--down)' : 'var(--ink-3)'
}

function Change({ reading }: { reading: DriverReading }) {
  if (reading.changePct === null) return <>{DRIVER_MAPS_COPY.unavailable}</>
  const arrow = reading.tone === 'up' ? '▲' : reading.tone === 'down' ? '▼' : '•'
  const sign = reading.changePct > 0 ? '+' : reading.changePct < 0 ? '−' : ''
  return <><span aria-hidden="true">{arrow}</span> {sign}{Math.abs(reading.changePct).toFixed(2)}%</>
}

type Props = {
  prices: PriceData | null
  // Commodity pages show just their own map; Markets shows all four.
  only?: DriverMap['key']
  page?: string
}

export default function DriverMaps({ prices, only, page = 'markets' }: Props) {
  const full = getDriverMaps(prices)
  const view = only ? { ...full, maps: full.maps.filter(map => map.key === only) } : full
  const isPro = useIsPro()
  const viewTracked = useRef(false)
  const time = formatPulseTime(view.timestamp)

  // Once per page view; is_pro rides on click events (useIsPro resolves after mount).
  useEffect(() => {
    if (!view.timestamp || viewTracked.current) return
    viewTracked.current = true
    trackEvent('visual_insight_viewed', {
      page,
      component: 'driver_maps',
      commodity: only,
      source_data_timestamp: view.timestamp,
      stale_data: Boolean(prices?.snapshotStale),
    })
  }, [only, page, prices?.snapshotStale, view.timestamp])

  if (!view.maps.length) return null

  const open = (map: DriverMap) => trackEvent('driver_map_source_opened', {
    page,
    component: 'driver_maps',
    commodity: map.key,
    source_data_timestamp: view.timestamp ?? undefined,
    is_pro: isPro,
    stale_data: map.mcxStale,
  })

  return <section aria-labelledby={`driver-maps-${only ?? 'all'}`} style={{ marginBottom: 32 }}>
    <div style={{ marginBottom: 14 }}>
      <span style={{ color: 'var(--gold)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>{DRIVER_MAPS_COPY.eyebrow}</span>
      <h2 id={`driver-maps-${only ?? 'all'}`} style={{ color: 'var(--ink)', fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 500, margin: '4px 0' }}>{DRIVER_MAPS_COPY.title}</h2>
      <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>
        {view.sessionOpen ? DRIVER_MAPS_COPY.subtitleOpen : DRIVER_MAPS_COPY.subtitleClosed}
        {time && <span style={{ color: prices?.snapshotStale ? '#C87000' : 'var(--ink-4)', marginLeft: 6 }}>{prices?.snapshotStale && <strong>{DRIVER_MAPS_COPY.delayed} · </strong>}Updated {time}</span>}
      </p>
    </div>
    <div className={only ? undefined : 'terminal-commodity-grid'} style={{ display: 'grid', gap: 12 }}>
      {view.maps.map(map => <Link key={map.key} href={map.href} onClick={() => open(map)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'inherit', padding: 16, textDecoration: 'none' }}>
        <strong style={{ color: 'var(--ink)', display: 'block', fontSize: 14 }}>
          {map.label} <span style={{ color: toneColour(map.mcx, map.mcxStale), float: 'right' }}><Change reading={map.mcx} /></span>
        </strong>
        {map.mcxStale && <span style={{ color: 'var(--ink-4)', display: 'block', fontSize: 10, marginTop: 2, textAlign: 'right' }}>{DRIVER_MAPS_COPY.delayed}</span>}
        <div style={{ borderTop: '1px solid var(--border)', fontSize: 12, marginTop: 12, paddingTop: 10 }}>
          <div style={{ color: 'var(--ink-2)', display: 'flex', justifyContent: 'space-between' }}><span>{map.benchmarkLabel}</span><strong style={{ color: map.benchmark.changePct === null ? 'var(--ink-4)' : undefined }}><Change reading={map.benchmark} /></strong></div>
          <div style={{ color: 'var(--ink-2)', display: 'flex', justifyContent: 'space-between', marginTop: 7 }}><span>{DRIVER_MAPS_COPY.usdinrLabel}</span><strong style={{ color: map.usdinr.changePct === null ? 'var(--ink-4)' : undefined }}><Change reading={map.usdinr} /></strong></div>
        </div>
        <p style={{ color: 'var(--ink-3)', fontSize: 12, lineHeight: 1.45, margin: '12px 0 0' }}>{map.sentence} {DRIVER_MAPS_COPY.usdinrNote}</p>
      </Link>)}
    </div>
  </section>
}
