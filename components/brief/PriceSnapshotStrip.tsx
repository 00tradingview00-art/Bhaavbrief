import type { PriceData } from '@/lib/prices'

const COMMODITY_MAP: Record<string, { key: keyof PriceData; label: string; unit: string }> = {
  'MCX Gold':        { key: 'gold',   label: 'Gold',   unit: '/10g' },
  'MCX Silver':      { key: 'silver', label: 'Silver', unit: '/kg'  },
  'MCX Crude':       { key: 'crude',  label: 'Crude',  unit: '/bbl' },
  'MCX Copper':      { key: 'copper', label: 'Copper', unit: '/kg'  },
  'MCX Natural Gas': { key: 'natgas', label: 'Nat Gas', unit: '/mmBtu' },
}

function fmtINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

// Part 12 §12.6 "Price Snapshot Strip" — sticky chip row, superseding the
// raw bold price sentence that used to open every brief's prose. Sourced
// from the live snapshot (not parsed from the brief's frozen prose text),
// since this strip is meant to show current, not historical, prices.
export default function PriceSnapshotStrip({ commodities, data }: { commodities: string[]; data: PriceData | null }) {
  if (!data) return null

  const items = commodities
    .map(c => COMMODITY_MAP[c])
    .filter(Boolean)
    .slice(0, 4)
    .map(cfg => {
      const d = data[cfg.key] as { mcx?: number; mcxChangePct?: number } | undefined
      if (!d?.mcx) return null
      return { ...cfg, price: d.mcx, pct: d.mcxChangePct ?? 0 }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  if (items.length === 0) return null

  return (
    <div style={{
      display: 'flex', gap: 8, overflowX: 'auto', marginBottom: '1.25rem',
      paddingBottom: 4,
    }}>
      {items.map(item => {
        const up = item.pct >= 0
        return (
          <div key={item.label} style={{
            flexShrink: 0, background: 'var(--surface-2, #FAFAF7)', borderRadius: 8,
            padding: '6px 10px', display: 'flex', alignItems: 'baseline', gap: 6,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
              {item.label}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {fmtINR(item.price)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: up ? 'var(--up)' : 'var(--down)' }}>
              {up ? '+' : ''}{item.pct.toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
