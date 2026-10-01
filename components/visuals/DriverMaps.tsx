'use client'

import Link from 'next/link'
import type { PriceData } from '@/lib/prices'

type Map = { key: string; label: string; mcx: number; benchmark: string; benchmarkChange: number; href: string }

function pct(value: number) { return `${value >= 0 ? '▲ +' : '▼ '}${Math.abs(value).toFixed(2)}%` }
function relationship(mcx: number, driver: number) {
  if (!mcx || !driver) return 'No clear comparison'
  return Math.sign(mcx) === Math.sign(driver) ? 'same direction' : 'working against'
}

export default function DriverMaps({ prices }: { prices: PriceData | null }) {
  if (!prices) return null
  const maps: Map[] = [
    { key: 'gold', label: 'MCX Gold', mcx: prices.gold.mcxChangePct, benchmark: 'Global gold', benchmarkChange: prices.goldComexPct, href: '/commodities/gold' },
    { key: 'silver', label: 'MCX Silver', mcx: prices.silver.mcxChangePct, benchmark: 'Global silver', benchmarkChange: prices.silverComexPct, href: '/commodities/silver' },
    { key: 'crude', label: 'MCX Crude Oil', mcx: prices.crude.mcxChangePct, benchmark: 'WTI crude', benchmarkChange: prices.crudePct, href: '/commodities/crude-oil' },
    { key: 'natgas', label: 'MCX Natural Gas', mcx: prices.natgas.mcxChangePct, benchmark: 'Henry Hub', benchmarkChange: prices.gasPct, href: '/commodities/natural-gas' },
  ]
  return <section aria-labelledby="driver-maps" style={{ marginBottom: 32 }}>
    <div style={{ marginBottom: 14 }}><span style={{ color: 'var(--gold)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>Market context</span><h2 id="driver-maps" style={{ color: 'var(--ink)', fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 500, margin: '4px 0' }}>What’s moving alongside MCX</h2><p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>Live market context, not a prediction or a causal model.</p></div>
    <div className="terminal-commodity-grid" style={{ display: 'grid', gap: 12 }}>
      {maps.map(map => <Link key={map.key} href={map.href} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'inherit', padding: 16, textDecoration: 'none' }}>
        <strong style={{ color: 'var(--ink)', display: 'block', fontSize: 14 }}>{map.label} <span style={{ color: map.mcx >= 0 ? 'var(--up)' : 'var(--down)', float: 'right' }}>{pct(map.mcx)}</span></strong>
        <div style={{ borderTop: '1px solid var(--border)', fontSize: 12, marginTop: 12, paddingTop: 10 }}>
          <div style={{ color: 'var(--ink-2)', display: 'flex', justifyContent: 'space-between' }}><span>{map.benchmark}</span><strong>{pct(map.benchmarkChange)}</strong></div>
          <div style={{ color: 'var(--ink-2)', display: 'flex', justifyContent: 'space-between', marginTop: 7 }}><span>USD/INR</span><strong>{pct(prices.usdinrChangePct)}</strong></div>
        </div>
        <p style={{ color: 'var(--ink-3)', fontSize: 12, lineHeight: 1.45, margin: '12px 0 0' }}>{map.benchmark} is moving {relationship(map.mcx, map.benchmarkChange)} to this MCX contract. USD/INR is additional India-market context.</p>
      </Link>)}
    </div>
  </section>
}
