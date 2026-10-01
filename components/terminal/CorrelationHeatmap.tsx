'use client'

import ProBlurGate from '@/components/ProBlurGate'
import type { CorrelationMatrix } from '@/lib/correlation'
import { previewCorrelationMatrix } from '@/lib/proPreview'
import { useProData } from '@/lib/useProData'
import CorrelationExplorer from '@/components/visuals/CorrelationExplorer'

interface Props {
  // Only the matrix's shape is rendered into the shared (ISR) homepage — the
  // real values are Pro data, fetched client-side from /api/pro/data once
  // the visitor is confirmed Pro. Non-Pro visitors see a synthetic matrix.
  labels:     string[]
  sampleSize: number
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

function trendTitle(v: number | null, prior: number | null): string | undefined {
  if (v === null) return undefined
  if (prior === null) return `Current 20D correlation: ${v.toFixed(2)}. Not enough history yet for a prior-window comparison.`
  const delta = v - prior
  const trend = Math.abs(delta) < 0.05 ? 'little changed vs' : delta > 0 ? 'strengthening vs' : 'weakening vs'
  return `Now: ${v.toFixed(2)} — ${trend} the prior 20D window (${prior.toFixed(2)}, Δ${delta >= 0 ? '+' : ''}${delta.toFixed(2)})`
}

function CorrelationTable({ correlation }: { correlation: CorrelationMatrix }) {
  const { labels, matrix, sampleSize, priorMatrix } = correlation
  return (
    <>
      <CorrelationExplorer correlation={correlation} />
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
                  const prior = priorMatrix ? priorMatrix[ri][ci] : null
                  const style = cellStyle(v)
                  return (
                    <td key={colLabel} style={{ textAlign: 'center', padding: '4px 6px' }}>
                      <span title={trendTitle(v, prior)} style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 38, height: 24, borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 10,
                        cursor: v !== null ? 'default' : undefined,
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
        <span>
          How closely these markets have been moving together ({sampleSize}-day window)
          {priorMatrix ? ' — hover a cell to see how it compares to the prior window' : ''}
        </span>
      </div>
    </>
  )
}

export default function CorrelationHeatmap({ labels, sampleSize }: Props) {
  const { isPro, data, failed } = useProData<CorrelationMatrix>('kind=correlation')
  if (sampleSize === 0) return null

  if (isPro) {
    if (data) return <CorrelationTable correlation={data} />
    return failed
      ? <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>Correlation data is unavailable right now — try again shortly.</p>
      : <div style={{ height: 200, borderRadius: 'var(--radius-md)' }} className="bb-skeleton-bar" />
  }

  const preview: CorrelationMatrix = {
    labels,
    matrix: previewCorrelationMatrix(labels.length),
    sampleSize,
    priorMatrix: null,
    priorSampleSize: 0,
  }
  return (
    <ProBlurGate
      label={`Cross-Asset Correlation — ${sampleSize}-day window`}
      timestamp="Live"
      preview={<CorrelationTable correlation={preview} />}
    />
  )
}
