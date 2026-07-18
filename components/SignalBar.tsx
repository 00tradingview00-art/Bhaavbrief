import type { PriceData } from '@/lib/prices'

interface Segment {
  label: string
  pct: number
}

// Homepage-only market pulse strip (Part 12 §12.4.2). Segment color is
// direction-only (green/red) — gold must never indicate direction, per the
// Gold Rule contract, so this component never renders var(--gold).
export default function SignalBar({ data }: { data: PriceData | null }) {
  if (!data) return null

  const segments: Segment[] = [
    { label: 'Gold',    pct: data.gold?.mcxChangePct   ?? 0 },
    { label: 'Silver',  pct: data.silver?.mcxChangePct ?? 0 },
    { label: 'Crude',   pct: data.crude?.mcxChangePct  ?? 0 },
    { label: 'Copper',  pct: data.copper?.mcxChangePct ?? 0 },
    { label: 'Nat Gas', pct: data.natgas?.mcxChangePct ?? 0 },
  ].filter(s => Number.isFinite(s.pct))

  const totalMagnitude = segments.reduce((sum, s) => sum + Math.abs(s.pct), 0)
  if (totalMagnitude === 0) return null

  const red   = segments.filter(s => s.pct < 0).sort((a, b) => a.pct - b.pct)
  const green = segments.filter(s => s.pct >= 0).sort((a, b) => b.pct - a.pct)

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--ink-4)', marginBottom: 6,
      }}>
        Market Signal · Today
      </div>
      <div style={{
        display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden',
      }}>
        {segments.map(s => (
          <div
            key={s.label}
            title={`${s.label} ${s.pct >= 0 ? '+' : ''}${s.pct.toFixed(2)}%`}
            style={{
              flex: Math.max(Math.abs(s.pct), 0.01) / totalMagnitude,
              background: s.pct >= 0 ? 'var(--up)' : 'var(--down)',
            }}
          />
        ))}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 6, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--down)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {red.map(s => (
            <span key={s.label}>{s.label} {s.pct.toFixed(2)}%</span>
          ))}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--up)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {green.map(s => (
            <span key={s.label}>{s.label} +{s.pct.toFixed(2)}%</span>
          ))}
        </div>
      </div>
    </div>
  )
}
