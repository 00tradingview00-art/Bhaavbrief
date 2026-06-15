import Link from 'next/link'
import type { BriefMeta } from '@/lib/briefs'
import { formatDate } from '@/lib/briefs'

export default function BriefCard({ brief, featured = false }: { brief: BriefMeta; featured?: boolean }) {
  const tag = brief.tags?.[0] ?? ''

  return (
    <Link href={`/briefs/${brief.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article style={{
        padding: featured ? '1.75rem 0' : '1.25rem 0',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
      }}>

        {/* Meta line */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: '0.55rem',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}>
          {tag && <span style={{ color: 'var(--gold)' }}>{tag}</span>}
          {tag && <span style={{ color: 'var(--border-2)' }}>·</span>}
          <span>{formatDate(brief.date)}</span>
          {brief.edition && (
            <>
              <span style={{ color: 'var(--border-2)' }}>·</span>
              <span>#{brief.edition}</span>
            </>
          )}
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: featured ? '1.5rem' : '1.05rem',
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          margin: '0 0 0.45rem',
        }}>
          {brief.title}
        </h2>

        {/* Summary */}
        {brief.summary && (
          <p style={{
            fontSize: featured ? 16 : 15,
            color: 'var(--ink-2)',
            lineHeight: 1.65,
            fontWeight: 300,
            margin: 0,
            maxWidth: '68ch',
          }}>
            {brief.summary}
          </p>
        )}
      </article>
    </Link>
  )
}
