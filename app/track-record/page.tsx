import { Metadata } from 'next'
import fs from 'fs'
import path from 'path'

export const revalidate = 300

export const metadata: Metadata = {
  title: "Track Record — Yesterday's Edge, Resolved | BhaavBrief",
  description: "Every Edge of the Day call BhaavBrief has made, resolved against real market data the next morning. Wins and misses both stay on the record.",
  alternates: { canonical: 'https://bhaavbrief.in/track-record' },
}

interface LedgerEntry {
  forEdition: number
  resolvedByEdition: number
  edgeMetric: string
  edgeLevel: number
  edgeCondition: 'above' | 'below'
  verdict: 'confirmed' | 'rejected' | 'unresolved'
  resolvedValue: number | null
  resolvedAt: string
}

function loadLedger(): LedgerEntry[] {
  try {
    const file = path.join(process.cwd(), 'data/edge-ledger.json')
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return []
  }
}

const VERDICT_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  confirmed:  { label: 'Confirmed',  color: '#166534', bg: '#DCFCE7' },
  rejected:   { label: 'Rejected',   color: '#991B1B', bg: '#FEE2E2' },
  unresolved: { label: 'Unresolved', color: '#78716C', bg: '#F5F5F4' },
}

export default function TrackRecordPage() {
  const ledger = loadLedger().slice().sort((a, b) => b.forEdition - a.forEdition)
  const confirmed = ledger.filter((e) => e.verdict === 'confirmed').length
  const rejected  = ledger.filter((e) => e.verdict === 'rejected').length
  const unresolved = ledger.filter((e) => e.verdict === 'unresolved').length
  const resolved = confirmed + rejected
  const hitRate = resolved > 0 ? Math.round((confirmed / resolved) * 100) : null
  const avgMove = resolved > 0
    ? (ledger
        .filter(e => e.verdict !== 'unresolved' && e.resolvedValue != null)
        .reduce((sum, e) => sum + Math.abs((e.resolvedValue! - e.edgeLevel) / e.edgeLevel * 100), 0)
      / resolved).toFixed(1)
    : null

  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.25rem 5rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>
          Track Record
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1rem' }}>
          Yesterday&apos;s Edge, resolved
        </h1>
        <p style={{ fontSize: 14.5, color: '#48483A', lineHeight: 1.75, marginBottom: '2rem', maxWidth: 620 }}>
          Every &quot;Edge of the Day&quot; call is a specific, falsifiable level to watch — never a buy/sell
          call. The next morning&apos;s brief resolves it against the actual closing price before writing
          anything new. Misses stay on this page; nothing gets quietly deleted.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, marginBottom: '2.5rem', background: '#DDDDD0' }}>
          {[
            { label: 'Resolved calls', value: resolved },
            { label: 'Confirmed', value: confirmed },
            { label: 'Rejected', value: rejected },
            { label: 'Unresolved', value: unresolved },
            { label: 'Hit rate', value: hitRate != null ? `${hitRate}%` : '—' },
            { label: 'Avg move', value: avgMove != null ? `${avgMove}%` : '—' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#F3F2EC', padding: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 800, color: '#18180F' }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {resolved > 0 && resolved < 20 && (
          <p style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 16 }}>
            Early data — {resolved} resolved {resolved === 1 ? 'call' : 'calls'} is a small sample. Statistical significance builds after ~20 observations.
          </p>
        )}

        {ledger.length === 0 ? (
          <p style={{ fontSize: 14, color: '#8A8A7A', fontStyle: 'italic' }}>
            No resolved calls yet — this feature started with edition #67 onward; the first resolution
            appears the morning after.
          </p>
        ) : (
          <div style={{ border: '0.5px solid #DDDDD0', borderRadius: 4, overflow: 'hidden' }}>
            {ledger.map((e) => {
              const style = VERDICT_STYLE[e.verdict]
              return (
                <div key={e.forEdition} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderBottom: '0.5px solid #DDDDD0', background: '#F3F2EC' }}>
                  <div>
                    <div style={{ fontSize: 13.5, color: '#18180F' }}>
                      Edition #{e.forEdition} — {e.edgeMetric.replace(/_/g, ' ')} {e.edgeCondition} {e.edgeLevel.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 11, color: '#8A8A7A', marginTop: 2 }}>
                      resolved {e.resolvedAt.slice(0, 10)}{e.resolvedValue != null ? ` · closed at ${e.resolvedValue.toLocaleString('en-IN')}` : ''}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: style.color, background: style.bg, padding: '4px 10px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                    {style.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
