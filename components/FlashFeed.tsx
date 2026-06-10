'use client'
import type { FlashMeta } from '@/lib/flash'

const CAT: Record<string, { bg: string; color: string; border: string }> = {
  energy: { bg: '#FFF7E0', color: '#996600', border: '#D4A830' },
  metals: { bg: '#EAF5EE', color: '#1E6630', border: '#5AAA70' },
  forex:  { bg: '#EEF2FF', color: '#3730A3', border: '#818CF8' },
  macro:  { bg: '#F3F2EC', color: '#48483A', border: '#C8C8B8' },
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
        const cat  = CAT[item.category] ?? CAT.macro
        const live = Date.now() - new Date(item.date).getTime() < 30 * 60_000
        return (
          <a
            key={item.slug}
            href={`/flash/${item.slug}`}
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '0.875rem 0', borderBottom: '0.5px solid #DDDDD0' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', border: `0.5px solid ${cat.border}`, background: cat.bg, color: cat.color, flexShrink: 0 }}>
                {item.category}
              </span>
              {live && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', background: '#C8720A', color: '#FAFAF6', flexShrink: 0 }}>
                  LIVE
                </span>
              )}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#8A8A7A', letterSpacing: '0.04em' }}>
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
