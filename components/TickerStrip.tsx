'use client'
import { useEffect, useState } from 'react'

interface TickerItem {
  label: string
  price: string
  pct:   string
  up:    boolean
}

const FALLBACK: TickerItem[] = [
  { label: 'MCX GOLD',   price: '—', pct: '—', up: true },
  { label: 'MCX SILVER', price: '—', pct: '—', up: true },
  { label: 'MCX CRUDE',  price: '—', pct: '—', up: true },
  { label: 'MCX COPPER', price: '—', pct: '—', up: true },
  { label: 'NAT GAS',    price: '—', pct: '—', up: true },
]

export default function TickerStrip() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/prices')
        if (!res.ok) return
        const data = await res.json()
        const priceList: { name: string; price: string; pct: string; up: boolean }[] = data.prices ?? []
        if (priceList.length === 0) return

        setItems(priceList.map(p => ({
          label: p.name.toUpperCase(),
          price: p.price,
          pct:   p.pct.replace('▲ ', '+').replace('▼ ', '-'),
          up:    p.up,
        })))
      } catch {
        // keep fallback
      }
    }

    load()
    const id = setInterval(load, 15 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const doubled = [...items, ...items]

  return (
    <div style={{
      background: 'var(--ink)',
      overflow: 'hidden',
      padding: '7px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400, letterSpacing: '0.3px' }}>
              {item.label}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#fff', fontWeight: 500 }}>
              {item.price}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontWeight: 500,
              color: item.pct === '—' ? 'rgba(255,255,255,0.4)' : item.up ? '#4ADE80' : '#F87171',
            }}>
              {item.pct}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
