import type { MarketIsSayingRow } from '@/lib/parseBriefSections'
import renderInlineBold from './renderInlineBold'
import Pill from '@/components/ui/Pill'

// Part 12 §12.4.5 "The Market Is Saying" module — chip rows, source order
// preserved (no fabricated significance ranking; the content pipeline's own
// prompt already orders by significance). Every sentence from the original
// section is rendered — sacred-section content is never dropped, only
// reformatted from a flowing paragraph into per-sentence rows.
export default function MarketIsSayingModule({ heading, rows }: { heading: string; rows: MarketIsSayingRow[] }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--gold)', margin: '1.5rem 0 0.5rem',
      }}>
        {heading}
      </h2>
      <div style={{ background: 'var(--surface-2, #FAFAF7)', borderRadius: 8, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '9px 12px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <Pill
              tone={row.pct === null ? 'neutral' : row.pct >= 0 ? 'up' : 'down'}
              size="xs"
              style={{ flexShrink: 0, marginTop: 2, fontWeight: 700, minWidth: 52, justifyContent: 'center' }}
            >
              {row.pct === null ? (row.commodity ?? '—') : `${row.pct >= 0 ? '+' : ''}${row.pct.toFixed(2)}%`}
            </Pill>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', fontWeight: 300 }}>
              {renderInlineBold(row.text)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
