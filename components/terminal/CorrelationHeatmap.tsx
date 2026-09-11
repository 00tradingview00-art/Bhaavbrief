import ProBlurGate from '@/components/ProBlurGate'
import type { CorrelationMatrix } from '@/lib/correlation'

interface Props {
  correlation: CorrelationMatrix
  isPro:       boolean
}

// Diverging scale: negative → down token, positive → up token, both scaled
// by |v| so weak correlations stay muted and strong ones read clearly.
function cellStyle(v: number | null): { background: string; color: string } {
  if (v === null) return { background: 'var(--surface-3)', color: 'var(--ink-4)' }
  const t = Math.min(Math.abs(v), 1)
  const base = v >= 0 ? '27,122,74' : '181,58,42' // --up / --down as rgb
  return {
    background: `rgba(${base}, ${(t * 0.55).toFixed(2)})`,
    color: t > 0.4 ? '#fff' : 'var(--ink-2)',
  }
}

export default function CorrelationHeatmap({ correlation, isPro }: Props) {
  const { labels, matrix, sampleSize } = correlation
  if (sampleSize === 0) return null

  return (
    <ProBlurGate isPro={isPro} label={`Cross-Asset Correlation — ${sampleSize}-day window`} timestamp="Live">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th />
              {labels.map(l => (
                <th key={l} style={{ fontWeight: 500, color: 'var(--ink-3)', padding: '4px 6px', fontSize: 10 }}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((rowLabel, ri) => (
              <tr key={rowLabel}>
                <td style={{ textAlign: 'left', color: 'var(--ink-2)', fontWeight: 500, padding: '4px 6px 4px 2px' }}>{rowLabel}</td>
                {labels.map((colLabel, ci) => {
                  const v = matrix[ri][ci]
                  const style = cellStyle(v)
                  return (
                    <td key={colLabel} style={{ textAlign: 'center', padding: '4px 6px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 38, height: 24, borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 10,
                        ...style,
                      }}>
                        {v !== null ? v.toFixed(2) : '—'}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 10, color: 'var(--ink-3)' }}>
        <span>Pearson correlation of daily returns, {sampleSize}-day window</span>
      </div>
    </ProBlurGate>
  )
}
