'use client'

import { useEffect, useRef, useState } from 'react'

export interface TerminalSection {
  id:    string
  label: string
}

const SCROLL_OFFSET = 96 // sticky header + tabbar height

// In-page scrollspy nav for the Terminal homepage. Intentionally separate
// from components/SectionTabs.tsx, which links between sibling *routes*
// (Markets/Options/Tools/...) — this one jumps between anchors within a
// single page. Only the sections actually built so far are passed in, so a
// module still being built in a later step never appears as a dead/empty tab.
export default function TerminalTabbar({ sections }: { sections: TerminalSection[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? '')
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const targets = sections
      .map(s => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)
    if (targets.length === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: `-${SCROLL_OFFSET + 8}px 0px -70% 0px`, threshold: 0 },
    )
    targets.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [sections])

  function jumpTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <div
      ref={barRef}
      style={{
        position: 'sticky', top: 53, zIndex: 40,
        background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
        margin: '0 0 24px',
      }}
    >
      <div style={{
        display: 'flex', gap: 4, padding: '9px 0', overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {sections.map(s => {
          const isActive = s.id === active
          return (
            <button
              key={s.id}
              onClick={() => jumpTo(s.id)}
              style={{
                flex: 'none', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                background: isActive ? 'var(--surface-3)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--border-2)' : 'transparent'}`,
                padding: '6px 12px', borderRadius: 'var(--radius-pill)',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
