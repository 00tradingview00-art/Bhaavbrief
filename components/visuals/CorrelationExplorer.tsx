'use client'

import { useState } from 'react'
import type { CorrelationMatrix } from '@/lib/correlation'
import { CORRELATION_INSIGHT_COPY, correlationLinks } from '@/lib/correlationInsight'

export default function CorrelationExplorer({ correlation }: { correlation: CorrelationMatrix }) {
  const [focal, setFocal] = useState(0)
  const links = correlationLinks(correlation, focal)
  const focalLabel = correlation.labels[focal] ?? ''

  return <div style={{ marginBottom: 16 }}>
    <div style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{CORRELATION_INSIGHT_COPY.heading(focalLabel)}</div>
    <div role="group" aria-label="Choose a market" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      {correlation.labels.map((label, i) => <button key={label} type="button" aria-pressed={i === focal} onClick={() => setFocal(i)} style={{
        background: i === focal ? 'var(--gold-pale, #FFF6E0)' : 'transparent',
        border: `1px solid ${i === focal ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 5, color: i === focal ? 'var(--gold-dark)' : 'var(--ink-3)', cursor: 'pointer',
        fontSize: 11, fontWeight: 600, minHeight: 32, padding: '6px 10px',
      }}>{label}</button>)}
    </div>
    <div aria-hidden="true" style={{ color: 'var(--ink-4)', display: 'grid', fontSize: 10, gap: 10, gridTemplateColumns: '72px 1fr', marginBottom: 2 }}>
      <span /><span style={{ display: 'flex', justifyContent: 'space-between' }}><span>{CORRELATION_INSIGHT_COPY.opposite}</span><span>{CORRELATION_INSIGHT_COPY.together}</span></span>
    </div>
    <ul style={{ display: 'grid', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
      {links.map(link => <li key={link.label} style={{ alignItems: 'center', display: 'grid', fontSize: 12, gap: 10, gridTemplateColumns: '72px 1fr' }}>
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{link.label}</span>
        <span>
          <span aria-hidden="true" style={{ display: 'block', height: 12, position: 'relative' }}>
            <span style={{ background: 'var(--border)', height: 2, left: 0, position: 'absolute', right: 0, top: 5 }} />
            <span style={{ background: 'var(--ink-4)', height: 12, left: '50%', position: 'absolute', top: 0, width: 1 }} />
            <span style={{ background: link.value >= 0 ? 'var(--up)' : 'var(--down)', borderRadius: '50%', height: 10, left: `calc(${link.position}% - 5px)`, position: 'absolute', top: 1, width: 10 }} />
          </span>
          <span style={{ color: 'var(--ink-3)', display: 'block', fontSize: 11, marginTop: 2 }}>
            {link.description} · {link.value.toFixed(2)}
            {link.trend && <> · <span aria-hidden="true">{link.trend === 'stronger' ? '↑' : '↓'}</span> {link.trend === 'stronger' ? CORRELATION_INSIGHT_COPY.stronger : CORRELATION_INSIGHT_COPY.weaker}</>}
          </span>
        </span>
      </li>)}
    </ul>
    <p style={{ color: 'var(--ink-3)', fontSize: 10.5, margin: '8px 0 0' }}>{CORRELATION_INSIGHT_COPY.boundary}</p>
  </div>
}
