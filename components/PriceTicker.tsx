'use client'
import { useEffect, useState } from 'react'

interface PriceItem {
  name: string; price: string; pct: string; up: boolean
}

export default function PriceTicker() {
  const [prices, setPrices] = useState<PriceItem[]>([])

  useEffect(() => {
    fetch('/api/prices')
      .then(r => r.json())
      .then(d => { if (d.prices?.length) setPrices(d.prices) })
      .catch(() => {})
  }, [])

  const items = prices.length
    ? [...prices, ...prices] // duplicate for seamless loop
    : [
        { name: 'MCX Crude', price: '—', pct: '—', up: true },
        { name: 'MCX Gold',  price: '—', pct: '—', up: true },
        { name: 'MCX Silver',price: '—', pct: '—', up: false },
        { name: 'MCX Copper',price: '—', pct: '—', up: true },
        { name: 'Nat Gas',   price: '—', pct: '—', up: false },
        { name: 'USDINR',    price: '—', pct: '—', up: false },
      ].concat([
        { name: 'MCX Crude', price: '—', pct: '—', up: true },
        { name: 'MCX Gold',  price: '—', pct: '—', up: true },
        { name: 'MCX Silver',price: '—', pct: '—', up: false },
        { name: 'MCX Copper',price: '—', pct: '—', up: true },
        { name: 'Nat Gas',   price: '—', pct: '—', up: false },
        { name: 'USDINR',    price: '—', pct: '—', up: false },
      ])

  return (
    <div style={{ background: '#18180F', borderBottom: '2.5px solid #C8720A', display: 'flex', overflow: 'hidden' }}>
      <div style={{
        background: '#C8720A', color: '#FAFAF6',
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 500,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '0 14px', display: 'flex', alignItems: 'center', flexShrink: 0,
      }}>
        LIVE BHAAV
      </div>
      <div style={{ overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{
          display: 'flex',
          animation: 'tickerScroll 28s linear infinite',
        }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRight: '0.5px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.08em', color: 'rgba(250,250,246,0.38)' }}>{item.name}</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 500, color: 'rgba(250,250,246,0.9)' }}>{item.price}</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: item.up ? '#72D18A' : '#E88888' }}>{item.pct}</span>
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
