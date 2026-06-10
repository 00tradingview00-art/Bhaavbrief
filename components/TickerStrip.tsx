'use client'
import { useEffect, useState, useRef } from 'react'
import type { PriceData } from '@/lib/prices'

// IST market hours: 9:00 AM – 11:30 PM = 03:30–18:00 UTC
function isMCXOpen(): boolean {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes()
  return mins >= 210 && mins <= 1080
}

function fmtINR(v: number): string {
  if (!v) return '—'
  if (v >= 10000) return `₹${Math.round(v).toLocaleString('en-IN')}`
  if (v >= 100)   return `₹${v.toFixed(2)}`
  return `₹${v.toFixed(2)}`
}

function fmtUSD(v: number): string {
  if (!v) return '—'
  if (v >= 1000) return `$${Math.round(v).toLocaleString('en-US')}`
  if (v >= 10)   return `$${v.toFixed(2)}`
  return `$${v.toFixed(3)}`
}

function fmtPct(p: number): string {
  const s = p >= 0 ? '+' : ''
  return `${s}${p.toFixed(2)}%`
}

interface Item {
  label: string
  price: string
  pct:   number
}

// No hardcoded fallback prices — show dashes until live data arrives.
// Stale hardcoded prices destroy trust when they disagree with the brief body.
const FALLBACK: Item[] = [
  { label: 'MCX GOLD',    price: '—', pct: 0 },
  { label: 'MCX SILVER',  price: '—', pct: 0 },
  { label: 'MCX CRUDE',   price: '—', pct: 0 },
  { label: 'MCX COPPER',  price: '—', pct: 0 },
  { label: 'MCX NAT GAS', price: '—', pct: 0 },
  { label: 'USD / INR',   price: '—', pct: 0 },
  { label: 'COMEX GOLD',  price: '—', pct: 0 },
  { label: 'WTI CRUDE',   price: '—', pct: 0 },
]

function mapToItems(d: PriceData): Item[] {
  return [
    { label: 'MCX GOLD',    price: fmtINR(d.gold.mcx),    pct: d.gold.mcxChangePct    },
    { label: 'MCX SILVER',  price: fmtINR(d.silver.mcx),  pct: d.silver.mcxChangePct  },
    { label: 'MCX CRUDE',   price: fmtINR(d.crude.mcx),   pct: d.crude.mcxChangePct   },
    { label: 'MCX COPPER',  price: fmtINR(d.copper.mcx),  pct: d.copper.mcxChangePct  },
    { label: 'MCX NAT GAS', price: fmtINR(d.natgas.mcx),  pct: d.natgas.mcxChangePct  },
    { label: 'USD / INR',   price: fmtINR(d.usdinr),      pct: d.usdinrChangePct      },
    { label: 'COMEX GOLD',  price: fmtUSD(d.comexGold),   pct: d.goldComexPct         },
    { label: 'WTI CRUDE',   price: fmtUSD(d.wti),         pct: d.crudePct             },
  ]
}

export default function TickerStrip({ initialPrices }: { initialPrices?: PriceData | null }) {
  // Start with real SSR prices if available, otherwise nothing — never stale hardcoded values
  const [items, setItems]         = useState<Item[]>(initialPrices ? mapToItems(initialPrices) : [])
  const [source, setSource]       = useState<string>(initialPrices?.source ?? '')
  const intervalRef               = useRef<NodeJS.Timeout>()

  async function load() {
    try {
      const res = await fetch('/api/prices', { cache: 'no-store' })
      if (!res.ok) return
      const d: PriceData = await res.json()
      setItems(mapToItems(d))
      setSource(d.source)
    } catch {
      // Keep current values — don't replace live data with nothing
    }
  }

  useEffect(() => {
    load()

    // During market hours refresh every 30 sec, outside every 5 min
    function scheduleNext() {
      const delay = isMCXOpen() ? 30_000 : 300_000
      intervalRef.current = setTimeout(async () => {
        await load()
        scheduleNext()
      }, delay)
    }

    scheduleNext()
    return () => clearTimeout(intervalRef.current)
  }, [])

  // Don't render the bar at all until we have live data — avoid an empty animated strip
  if (items.length === 0) return null

  const doubled = [...items, ...items]

  return (
    <div style={{
      background: 'var(--ink)',
      overflow: 'hidden',
      padding: '7px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div className="ticker-track" style={{ display: 'flex', gap: 36, whiteSpace: 'nowrap' }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.42)', fontWeight: 400, letterSpacing: '0.3px' }}>
              {item.label}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#fff', fontWeight: 500 }}>
              {item.price}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontWeight: 500,
              color: item.pct > 0  ? '#4ADE80'
                   : item.pct < 0  ? '#F87171'
                   : 'rgba(255,255,255,0.35)',
            }}>
              {fmtPct(item.pct)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
