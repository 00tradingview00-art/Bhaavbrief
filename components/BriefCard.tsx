import Link from 'next/link'
import type { BriefMeta } from '@/lib/briefs'
import { formatDate } from '@/lib/briefs'

const TAG_STYLES: Record<string, React.CSSProperties> = {
  energy:  { background: '#FFF7E0', color: '#996600', borderColor: '#D4A830' },
  metals:  { background: '#EAF5EE', color: '#1E6630', borderColor: '#5AAA70' },
  agri:    { background: '#FDF0F0', color: '#991818', borderColor: '#D07070' },
  default: { background: '#F3F2EC', color: '#48483A', borderColor: '#C8C8B8' },
}

export default function BriefCard({ brief, featured = false }: { brief: BriefMeta; featured?: boolean }) {
  const tag = brief.tags?.[0]?.toLowerCase() ?? 'default'
  const tagStyle = TAG_STYLES[tag] ?? TAG_STYLES.default

  return (
    <Link href={`/briefs/${brief.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article style={{
        padding: featured ? '1.5rem 0' : '1.25rem 0',
        borderBottom: '0.5px solid #DDDDD0',
        cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.08em',
            textTransform: 'uppercase', padding: '3px 8px', border: '0.5px solid',
            flexShrink: 0, marginTop: 2, ...tagStyle,
          }}>
            {brief.tags?.[0] ?? 'Brief'}
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.05em', color: '#8A8A7A' }}>
            {formatDate(brief.date)}
          </span>
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: featured ? '1.4rem' : '1rem',
          fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em',
          color: '#18180F', marginBottom: '0.4rem',
        }}>
          {brief.title}
        </h2>

        {brief.summary && (
          <p style={{ fontSize: 13, color: '#48483A', lineHeight: 1.65, fontWeight: 300, margin: 0 }}>
            {brief.summary}
          </p>
        )}

        <div style={{ marginTop: '0.5rem', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {brief.commodities?.map(c => (
            <span key={c} style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#8A8A7A',
              background: '#F3F2EC', padding: '2px 8px',
            }}>
              {c}
            </span>
          ))}
        </div>
      </article>
    </Link>
  )
}
