import Link from 'next/link'
import type { PriceBridgeRow } from '@/lib/parseBriefSections'

// Part 12 §12.10.4 — Commodity | Global Price | FX Rate | MCX Price | Direction.
// `heading` renders as a real <h2> with the brief's original section text so
// components/BriefScrollTracker.tsx keeps observing this section unchanged.
export default function PriceBridgeTable({ heading, rows }: { heading: string; rows: PriceBridgeRow[] }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--ink-4)', margin: '1.5rem 0 0.75rem',
      }}>
        {heading}
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-2)' }}>
              {['Commodity', 'Global Price', 'FX Rate', 'MCX Price', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 12px 6px 0', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.commodity} style={{ borderBottom: '0.5px solid var(--border)' }}>
                <td style={{ padding: '7px 12px 7px 0', color: 'var(--ink)', fontWeight: 600 }}>{row.commodity}</td>
                <td style={{ padding: '7px 12px 7px 0', color: 'var(--ink-2)' }}>{row.global}</td>
                <td style={{ padding: '7px 12px 7px 0', color: 'var(--ink-2)' }}>{row.fx}</td>
                <td style={{
                  padding: '7px 12px 7px 0', fontWeight: 700,
                  color: row.pct === null ? 'var(--ink)' : row.pct >= 0 ? 'var(--up)' : 'var(--down)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {row.mcx}
                </td>
                <td style={{ padding: '7px 0', fontWeight: 700, color: row.pct === null ? 'var(--ink-4)' : row.pct >= 0 ? 'var(--up)' : 'var(--down)' }}>
                  {row.pct === null ? '—' : `${row.pct >= 0 ? '▲' : '▼'} ${row.pct >= 0 ? '+' : ''}${row.pct.toFixed(2)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)',
        margin: '0.5rem 0 0',
      }}>
        Full settlement data (OHLC, volume, OI) →{' '}
        <Link href="/articles/2026-07-03-mcx-bhavcopy" style={{ color: 'var(--ink-3)' }}>
          MCX Bhavcopy Explained
        </Link>
      </p>
    </div>
  )
}
