import Pill from '@/components/ui/Pill'

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
      {tabs.map(tab => (
        <Pill key={tab.href} href={tab.href} size="md" tone="neutral" active={tab.href === active}>
          {tab.label}
        </Pill>
      ))}
    </div>
  )
}
