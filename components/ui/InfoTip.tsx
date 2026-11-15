'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Small "ⓘ" hover/click tooltip — a plain-language one-liner for a jargon
 * label, with no layout footprint (the popup is a fixed-position portal to
 * document.body, so it's safe inside a dense, clipped card grid, unlike
 * MetricExplainDrawer's inline expand-in-place, which needs room to grow).
 * Extracted from components/mcx/OptionChain.tsx, which still owns it as a
 * private `InfoTip` for its own analytics-strip pills — this is the same
 * component, just made reusable rather than redefined a second time.
 */
export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const width = 200
    setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - width - 8) })
  }

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', marginLeft: 4, verticalAlign: 'middle' }}
      onMouseEnter={() => { place(); setOpen(true) }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={e => { e.stopPropagation(); place(); setOpen(o => !o) }}
        aria-label="What is this?"
        className="bb-icon-tip"
        style={{
          width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--ink-4)',
          background: 'transparent', color: 'var(--ink-4)', fontSize: 9, fontWeight: 700,
          lineHeight: '11px', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          textTransform: 'none', letterSpacing: 'normal', flexShrink: 0,
        }}
      >i</button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
          width: 200, padding: '8px 10px', borderRadius: 6, background: 'var(--ink)',
          color: '#fff', fontSize: 11, fontWeight: 400, lineHeight: 1.4,
          fontFamily: 'var(--font-sans)', textTransform: 'none', letterSpacing: 'normal',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        }}>
          {text}
        </div>,
        document.body,
      )}
    </span>
  )
}
