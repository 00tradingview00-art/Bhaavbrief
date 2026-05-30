'use client'
import { useEffect, useState } from 'react'

interface PriceItem {
  name: string; price: string; pct: string; up: boolean
}

function fmt(v: number, prefix: string, dec = 0) {
  if (!v) return '—'
  return `${prefix}${v.toLocaleString('en-IN', { maximumFractionDigits: dec, minimumFractionDigits: dec })}`
}
function pct(v: number) {
  if (v === 0) return '+0.00%'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

export default function PriceTicker() {
  const [prices, setPrices] = useState<PriceItem[]>([])

  useEffect(() => {
    fetch('/api/prices')
      .then(r => r.json())
      .then(d => {
        if (!d.gold) return
        setPrices([
          { name: 'MCX Gold',   price: fmt(d.gold?.mcx,   '₹'),      pct: pct(d.gold?.mcxChangePct   ?? 0), up: (d.gold?.mcxChangePct   ?? 0) >= 0 },
          { name: 'MCX Silver', price: fmt(d.silver?.mcx, '₹'),      pct: pct(d.silver?.mcxChangePct ?? 0), up: (d.silver?.mcxChangePct ?? 0) >= 0 },
          { name: 'MCX Crude',  price: fmt(d.crude?.mcx,  '₹'),      pct: pct(d.crude?.mcxChangePct  ?? 0), up: (d.crude?.mcxChangePct  ?? 0) >= 0 },
          { name: 'MCX Copper', price: fmt(d.copper?.mcx, '₹', 2),   pct: pct(d.copper?.mcxChangePct ?? 0), up: (d.copper?.mcxChangePct ?? 0) >= 0 },
          { name: 'Nat Gas',    price: fmt(d.natgas?.mcx, '₹', 2),   pct: pct(d.natgas?.mcxChangePct ?? 0), up: (d.natgas?.mcxChangePct ?? 0) >= 0 },
          { name: 'USD/INR',    price: fmt(d.usdinr,      '₹', 2),   pct: pct(d.usdinrChangePct      ?? 0), up: (d.usdinrChangePct      ?? 0) >= 0 },
        ])
      })
      .catch(() => {})
  }, [])

  const base = prices.length ? prices : [
    { name: 'MCX Gold',   price: '—', pct: '—', up: true  },
    { name: 'MCX Silver', price: '—', pct: '—', up: true  },
    { name: 'MCX Crude',  price: '—', pct: '—', up: true  },
    { name: 'MCX Copper', price: '—', pct: '—', up: true  },
    { name: 'Nat Gas',    price: '—', pct: '—', up: false },
    { name: 'USD/INR',    price: '—', pct: '—', up: false },
  ]
  const items = [...base, ...base]

  return (
    <div style={{ background: '#18180F', borderBottom: '2.5px solid #C8720A', display: 'flex', overflow: 'hidden' }}>
      <div style={{
        background: '#C8720A', color: '#FAFAF6',
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '0 14px', display: 'flex', alignItems: 'center', flexShrink: 0,
      }}>
        LIVE BHAAV
      </div>
      <div style={{ overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', animation: 'tickerScroll 22s linear infinite' }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRight: '0.5px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', color: 'rgba(250,250,246,0.38)' }}>{item.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: 'rgba(250,250,246,0.9)' }}>{item.price}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: item.up ? '#72D18A' : '#E88888' }}>{item.pct}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
