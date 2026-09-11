import Link from 'next/link'
import type { PriceData, MCXData } from '@/lib/prices'

interface MoverRow {
  label: string
  slug:  string
  unit:  string
  data:  MCXData
}

// MCX side only — no NSE sector-index data source exists anywhere in this
// codebase (the artifact's mockup paired MCX movers with Nifty Metal/Energy/IT,
// but that's not real data here), so this ranks MCX contracts only, not a
// mixed MCX+NSE table.
const ROWS: { key: keyof PriceData; label: string; slug: string; unit: string }[] = [
  { key: 'gold',        label: 'MCX Gold',        slug: 'gold',        unit: '/10g' },
  { key: 'silver',      label: 'MCX Silver',      slug: 'silver',      unit: '/kg' },
  { key: 'crude',       label: 'MCX Crude Oil',   slug: 'crude-oil',   unit: '/bbl' },
  { key: 'copper',      label: 'MCX Copper',      slug: 'copper',      unit: '/kg' },
  { key: 'natgas',      label: 'MCX Natural Gas', slug: 'natural-gas', unit: '/mmBtu' },
  { key: 'zinc',        label: 'MCX Zinc',        slug: 'zinc',        unit: '/kg' },
  { key: 'lead',        label: 'MCX Lead',        slug: 'lead',        unit: '/kg' },
  { key: 'aluminium',   label: 'MCX Aluminium',   slug: 'aluminium',   unit: '/kg' },
  { key: 'nickel',      label: 'MCX Nickel',      slug: 'nickel',      unit: '/kg' },
  { key: 'electricity', label: 'MCX Electricity', slug: 'electricity', unit: '/MWh' },
]

export default function MoversPanel({ prices }: { prices: PriceData | null }) {
  if (!prices) return null

  const rows: MoverRow[] = ROWS
    .map(r => ({ label: r.label, slug: r.slug, unit: r.unit, data: prices[r.key] as MCXData | undefined }))
    .filter((r): r is MoverRow => !!r.data && r.data.mcx > 0)
    .sort((a, b) => b.data.mcxChangePct - a.data.mcxChangePct)

  if (rows.length === 0) return null

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr>
            {['Instrument', 'Price', 'Change'].map((h, i) => (
              <th key={h} style={{
                textAlign: i === 0 ? 'left' : 'right', fontWeight: 500, color: 'var(--ink-3)',
                fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em',
                padding: '8px 10px', borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const up = r.data.mcxChangePct >= 0
            return (
              <tr key={r.slug}>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border-2)' }}>
                  <Link href={`/commodities/${r.slug}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{r.label}</Link>
                </td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border-2)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  {r.data.mcx.toLocaleString('en-IN', { maximumFractionDigits: r.data.mcx < 1000 ? 2 : 0 })}
                  <span style={{ fontSize: 10, color: 'var(--ink-4)', marginLeft: 3 }}>{r.unit}</span>
                </td>
                <td style={{
                  padding: '9px 10px', borderBottom: '1px solid var(--border-2)', textAlign: 'right', fontFamily: 'var(--font-mono)',
                  color: r.data.mcxStale ? 'var(--ink-4)' : up ? 'var(--up)' : 'var(--down)',
                }}>
                  {r.data.mcxStale ? 'last known' : `${up ? '▲' : '▼'} ${up ? '+' : ''}${r.data.mcxChangePct.toFixed(2)}%`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
