'use client'
import type { PriceData } from '@/lib/prices'
import { useLivePrices } from '@/components/LivePricesProvider'

// Poll faster during MCX hours — shared DST-aware clock (scripts/lib/mcxHours.js).

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
  // Shared poll (one fetch for the whole page tree, see LivePricesProvider in
  // app/layout.tsx) rather than this component's own — previously every page
  // ran this poll AND whatever page-specific component also wanted live
  // prices, doubling/tripling requests to /api/prices and tripping its rate
  // limit in production (2026-11-20).
  const live  = useLivePrices()
  const d     = live ?? initialPrices ?? null
  const items = d ? mapToItems(d) : []
  const generatedAtIST = d?.generatedAtIST ?? ''

  // Reserve the bar's real height even before live data arrives — returning null here
  // let this sticky, every-page shell collapse to 0px and then pop in once `load()`
  // resolves, which was the single biggest real-user layout-shift source site-wide
  // (PageSpeed field CLS 0.13 vs. lab CLS ~0.003 — a fresh lab run always has
  // initialPrices from the server, so this never reproduced synthetically). Same
  // padding/font-size as the live strip, just invisible, so there's nothing to shift.
  if (items.length === 0) {
    return (
      <div style={{ background: 'var(--ink)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="ticker-desktop-wrap" style={{ overflow: 'hidden', padding: '7px 0' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', fontSize: 12, visibility: 'hidden' }}>
            &nbsp;
          </div>
        </div>
        <div className="ticker-mobile-wrap" style={{ whiteSpace: 'nowrap', overflowX: 'auto', padding: '7px 12px' }}>
          <span style={{ fontSize: 12, visibility: 'hidden' }}>&nbsp;</span>
        </div>
      </div>
    )
  }

  const doubled = [...items, ...items]
  // Mobile: the 5 MCX commodities only (drop USD/INR, COMEX Gold, WTI Crude —
  // desktop-only extras), no auto-scroll — a continuously moving strip you
  // can't read or tap is worse UX on a phone than a plain swipeable row.
  const mobileItems = items.slice(0, 5)

  const renderItem = (item: Item, i: number) => (
    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, flex: '0 0 auto' }}>
      <span style={{ color: 'rgba(255,255,255,0.42)', fontWeight: 400, letterSpacing: '0.3px' }}>
        {item.label}
      </span>
      <span style={{ fontFamily: 'var(--font-sans)', color: '#fff', fontWeight: 500 }}>
        {item.price}
      </span>
      <span style={{
        fontFamily: 'var(--font-sans)', fontWeight: 500,
        color: item.pct > 0  ? '#4ADE80'
             : item.pct < 0  ? '#F87171'
             : 'rgba(255,255,255,0.35)',
      }}>
        {fmtPct(item.pct)}
      </span>
    </span>
  )

  return (
    <div style={{ background: 'var(--ink)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="ticker-desktop-wrap" style={{ overflow: 'hidden', padding: '7px 0' }}>
        <div className="ticker-track" style={{ display: 'flex', gap: 36, whiteSpace: 'nowrap' }}>
          {doubled.map(renderItem)}
        </div>
      </div>
      <div className="ticker-mobile-wrap" style={{ gap: 20, whiteSpace: 'nowrap', overflowX: 'auto', padding: '7px 12px', WebkitOverflowScrolling: 'touch' }}>
        {mobileItems.map(renderItem)}
      </div>
      {generatedAtIST && (
        <div style={{
          textAlign: 'right', padding: '0 12px 3px',
          fontSize: 10, color: 'rgba(255,255,255,0.25)',
          fontFamily: 'var(--font-sans)', letterSpacing: '0.03em',
        }}>
          as of {generatedAtIST}
        </div>
      )}
    </div>
  )
}
