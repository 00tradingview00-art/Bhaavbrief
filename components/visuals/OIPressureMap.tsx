import { OI_PRESSURE_COPY, type OIPressureView } from '@/lib/oiPressure'

function Bar({ oi, max, top, side }: { oi: number | null; max: number; top: boolean; side: 'put' | 'call' }) {
  if (oi === null) return <span />
  const colour = side === 'call' ? 'var(--up)' : 'var(--gold-dark)'
  return <span style={{ display: 'flex', justifyContent: side === 'put' ? 'flex-end' : 'flex-start' }}>
    <span style={{ background: colour, height: 8, opacity: top ? 0.9 : 0.3, width: `${Math.max(3, (oi / max) * 100)}%` }} />
  </span>
}

export default function OIPressureMap({ view, expiry, stale }: { view: OIPressureView; expiry?: string | null; stale?: boolean }) {
  return <figure style={{ margin: '0 0 0.9rem' }}>
    <figcaption style={{ color: 'var(--ink-3)', fontSize: '0.72rem', marginBottom: 6 }}>
      {OI_PRESSURE_COPY.caption}{expiry ? ` · ${expiry} expiry` : ''}{stale ? ' · Last known data' : ''}
    </figcaption>
    <div aria-hidden="true" style={{ color: 'var(--ink-4)', display: 'grid', fontSize: '0.66rem', gap: 6, gridTemplateColumns: '1fr 64px 1fr', marginBottom: 2 }}>
      <span style={{ textAlign: 'right' }}>{OI_PRESSURE_COPY.putSide}</span><span /><span>{OI_PRESSURE_COPY.callSide}</span>
    </div>
    <div role="list" style={{ display: 'grid', gap: 3 }}>
      {view.rows.map(row => row.kind === 'futures'
        ? <div key="futures" role="listitem" style={{ alignItems: 'center', borderBottom: '1px dashed var(--ink-3)', borderTop: '1px dashed var(--ink-3)', color: 'var(--ink)', display: 'grid', fontSize: '0.72rem', fontWeight: 700, gap: 6, gridTemplateColumns: '1fr 64px 1fr', padding: '2px 0' }}>
            <span /><span style={{ textAlign: 'center' }}>{OI_PRESSURE_COPY.futures} {row.price.toLocaleString()}</span><span />
          </div>
        : <div key={row.strike} role="listitem" aria-label={`Strike ${row.strike.toLocaleString()}: put OI ${row.putOI?.toLocaleString() ?? 'not in top list'}, call OI ${row.callOI?.toLocaleString() ?? 'not in top list'}`} style={{ alignItems: 'center', display: 'grid', fontSize: '0.72rem', gap: 6, gridTemplateColumns: '1fr 64px 1fr' }}>
            <Bar oi={row.putOI} max={view.maxOI} top={row.putTop} side="put" />
            <span style={{ color: row.callTop || row.putTop ? 'var(--ink)' : 'var(--ink-3)', fontVariantNumeric: 'tabular-nums', fontWeight: row.callTop || row.putTop ? 700 : 500, textAlign: 'center' }}>{row.strike.toLocaleString()}</span>
            <Bar oi={row.callOI} max={view.maxOI} top={row.callTop} side="call" />
          </div>)}
    </div>
    <p style={{ color: 'var(--ink-3)', fontSize: '0.72rem', margin: '6px 0 0' }}>{OI_PRESSURE_COPY.boundary}</p>
  </figure>
}
