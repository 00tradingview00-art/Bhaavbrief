import type { MarketIsSayingRow } from '@/lib/parseBriefSections'

// Renders **bold** spans as <strong> without invoking the full MDX pipeline
// per row — this content only ever uses bold markers (confirmed against
// sampled editions), never links or lists.
function renderInlineBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} style={{ color: 'var(--ink)', fontWeight: 600 }}>{part}</strong> : part
  )
}

// Part 12 §12.4.5 "The Market Is Saying" module — chip rows, source order
// preserved (no fabricated significance ranking; the content pipeline's own
// prompt already orders by significance). Every sentence from the original
// section is rendered — sacred-section content is never dropped, only
// reformatted from a flowing paragraph into per-sentence rows.
export default function MarketIsSayingModule({ heading, rows }: { heading: string; rows: MarketIsSayingRow[] }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
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
            <span style={{
              flexShrink: 0, marginTop: 2,
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              padding: '2px 6px', borderRadius: 4, minWidth: 52, textAlign: 'center',
              background: row.pct === null ? 'var(--surface-3)' : row.pct >= 0 ? 'var(--up-bg)' : 'var(--down-bg)',
              color: row.pct === null ? 'var(--ink-4)' : row.pct >= 0 ? 'var(--up)' : 'var(--down)',
            }}>
              {row.pct === null ? (row.commodity ?? '—') : `${row.pct >= 0 ? '+' : ''}${row.pct.toFixed(2)}%`}
            </span>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', fontWeight: 300 }}>
              {renderInlineBold(row.text)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
