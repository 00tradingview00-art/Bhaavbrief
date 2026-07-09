import Link from 'next/link'

interface Tab {
  label: string
  href:  string
}

// Lightweight sub-nav connecting two sibling pages that share one top-level
// nav slot (e.g. Briefs/Feed, Learn/Invest) — plain <Link> navigation between
// distinct routes, not client-side content switching, so each page keeps its
// own metadata/canonical URL/SEO.
export default function SectionTabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
      {tabs.map(tab => {
        const isActive = tab.href === active
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.04em',
              padding: '6px 14px',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              background: isActive ? 'var(--gold)' : 'var(--surface-1)',
              color: isActive ? '#FAFAF6' : 'var(--ink-2)',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
