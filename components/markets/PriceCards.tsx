import { getPrices } from '@/lib/prices'

const CARDS = [
  { key: 'gold',    label: 'MCX Gold',    unit: 'per 10g',    format: (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}` },
  { key: 'silver',  label: 'MCX Silver',  unit: 'per kg',     format: (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}` },
  { key: 'crude',   label: 'MCX Crude',   unit: 'per bbl',    format: (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}` },
  { key: 'copper',  label: 'MCX Copper',  unit: 'per kg',     format: (v: number) => `₹${v.toFixed(2)}` },
  { key: 'natgas',  label: 'MCX Nat Gas', unit: 'per mmBtu',  format: (v: number) => `₹${v.toFixed(2)}` },
  { key: 'usdinr',  label: 'USD / INR',   unit: 'spot rate',  format: (v: number) => `₹${v.toFixed(2)}` },
]

export default async function PriceCards() {
  const prices = await getPrices() as Record<string, Record<string, number>>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
      {CARDS.map(({ key, label, unit, format }) => {
        const item  = prices[key]
        const value = item?.mcx ?? item?.spot ?? 0
        const pct   = item?.mcxChangePct ?? item?.spotChangePct ?? 0
        const isUp  = pct >= 0

        return (
          <div
            key={key}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 18px',
              cursor: 'default',
              transition: 'border-color .15s',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 5 }}>
              {label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>
              {value > 0 ? format(value) : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 8 }}>{unit}</div>
            {value > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
                background: isUp ? 'var(--up-bg)' : 'var(--down-bg)',
                color: isUp ? 'var(--up)' : 'var(--down)',
              }}>
                {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{pct.toFixed(2)}%
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
