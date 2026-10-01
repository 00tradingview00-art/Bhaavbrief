'use client'

import { useId, useState } from 'react'
import Link from 'next/link'

type Props = {
  metric: string
  current: string
  shows: string
  doesNotMean: string
  href: string
  linkLabel: string
}

export default function MetricExplainDrawer({ metric, current, shows, doesNotMean, href, linkLabel }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <div style={{ marginTop: 8 }}>
    <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} style={{ background: 'none', border: 0, color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, padding: '6px 0', textAlign: 'left' }}>
      <span aria-hidden="true">ⓘ</span> Explain {metric}
    </button>
    <div id={id} hidden={!open} style={{ background: 'var(--surface-2)', borderLeft: '2px solid var(--gold)', color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.55, padding: '12px 14px' }}>
      <strong style={{ color: 'var(--ink)' }}>{metric} {current}</strong>
      <p style={{ margin: '8px 0 0' }}><strong>What it shows:</strong> {shows}</p>
      <p style={{ margin: '8px 0 0' }}><strong>What it doesn’t mean:</strong> {doesNotMean}</p>
      <Link href={href} style={{ color: 'var(--gold)', display: 'inline-block', fontWeight: 700, marginTop: 10, textDecoration: 'none' }}>{linkLabel} →</Link>
    </div>
  </div>
}
