'use client'
import { useEffect, useState } from 'react'

interface TickerItem {
  label: string
  price: string
  pct:   string
  up:    boolean
}

const FALLBACK: TickerItem[] = [
  { label: 'MCX GOLD',    price: '—', pct: '—', up: true },
  { label: 'MCX SILVER',  price: '—', pct: '—', up: true },
  { label: 'MCX CRUDE',   price: '—', pct: '—', up: true },
  { label: 'MCX COPPER',  price: '—', pct: '—', up: true },
  { label: 'MCX NAT GAS', price: '—', pct: '—', up: true },
  { label: 'USD/INR',     price: '—', pct: '—', up: true },
  { label: 'COMEX GOLD',  price: '—', pct: '—', up: true },
  { label: 'WTI CRUDE',   price: '—', pct: '—', up: true },
]

function fmt(p: number): { pct: string; up: boolean } {
  const up  = p >= 0
  const abs = Math.abs(p)
  return {
    pct: abs < 0.001 ? '0.00%' : `${up ? '+' : '-'}${abs.toFixed(2)}%`,
    up,
  }
}

export default function TickerStrip() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/prices')
        if (!res.ok) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d: Record<string, any> = await res.json()
        if (!d || !d.gold?.mcx) return

        const next: TickerItem[] = []

        if (d.gold?.mcx) {
          const { pct, up } = fmt(d.gold.mcxChangePct ?? 0)
          next.push({ label: 'MCX GOLD', price: `₹${Math.round(d.gold.mcx).toLocaleString('en-IN')}`, pct, up })
        }
        if (d.silver?.mcx) {
          const { pct, up } = fmt(d.silver.mcxChangePct ?? 0)
          next.push({ label: 'MCX SILVER', price: `₹${Math.round(d.silver.mcx).toLocaleString('en-IN')}`, pct, up })
        }
        if (d.crude?.mcx) {
          const { pct, up } = fmt(d.crude.mcxChangePct ?? 0)
          next.push({ label: 'MCX CRUDE', price: `₹${Math.round(d.crude.mcx).toLocaleString('en-IN')}`, pct, up })
        }
        if (d.copper?.mcx) {
          const { pct, up } = fmt(d.copper.mcxChangePct ?? 0)
          next.push({ label: 'MCX COPPER', price: `₹${d.copper.mcx.toFixed(2)}`, pct, up })
        }
        if (d.natgas?.mcx) {
          const { pct, up } = fmt(d.natgas.mcxChangePct ?? 0)
          next.push({ label: 'MCX NAT GAS', price: `₹${d.natgas.mcx.toFixed(2)}`, pct, up })
        }
        if (d.usdinr?.spot) {
          const { pct, up } = fmt(d.usdinr.spotChangePct ?? 0)
          next.push({ label: 'USD/INR', price: `₹${d.usdinr.spot.toFixed(2)}`, pct, up })
        }
        if (d.comexGold) {
          const { pct, up } = fmt(d.goldComexPct ?? 0)
          next.push({ label: 'COMEX GOLD', price: `$${Math.round(d.comexGold).toLocaleString('en-US')}`, pct, up })
        }
        if (d.wti) {
          const { pct, up } = fmt(d.crudePct ?? 0)
          next.push({ label: 'WTI CRUDE', price: `$${d.wti.toFixed(2)}`, pct, up })
        }

        if (next.length > 0) setItems(next)
      } catch {
        // keep fallback
      }
    }

    load()
    const id = setInterval(load, 5 * 60 * 1000)
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
