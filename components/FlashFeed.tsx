'use client'
import type { FlashMeta } from '@/lib/flash'
import Pill, { type PillTone } from '@/components/ui/Pill'

const CATEGORY_TONE: Partial<Record<FlashMeta['category'], PillTone>> = {
  energy: 'energy',
  metals: 'metals',
  forex:  'forex',
  macro:  'macro',
}

function fmtIST(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    hour12: true,
  })
}

export default function FlashFeed({ items }: { items: FlashMeta[] }) {

  if (items.length === 0) return null

  return (
    <div>
      {items.map(item => {
        const tone = CATEGORY_TONE[item.category] ?? 'macro'
        const live = Date.now() - new Date(item.date).getTime() < 30 * 60_000
        return (
          <a
            key={item.slug}
            href={`/flash/${item.slug}`}
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '0.875rem 0', borderBottom: '0.5px solid #DDDDD0' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <Pill tone={tone} size="xs">{item.category}</Pill>
              {live && <Pill tone="live" size="xs">LIVE</Pill>}
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>
                {fmtIST(item.date)}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.35, color: '#18180F' }}>
              {item.title}
            </div>
          </a>
        )
      })}
    </div>
  )
}
