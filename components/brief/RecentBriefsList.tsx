import Link from 'next/link'
import type { BriefMeta } from '@/lib/briefs'

export interface RecentBriefsListProps {
  /** Briefs to render — already filtered/sliced by the caller. */
  briefs: BriefMeta[]
  /** Section heading, e.g. "Recent Gold Briefs" or generic "Recent Briefs". */
  heading: string
  /**
   * Edition-badge + "View all briefs" link color. Defaults to the theme-aware
   * brand accent for pages with no single commodity color. Commodity pages
   * pass their own per-commodity hex to preserve their existing look.
   */
  accentColor?: string
}

export default function RecentBriefsList({ briefs, heading, accentColor = 'var(--gold)' }: RecentBriefsListProps) {
  if (briefs.length === 0) return null
  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)', margin: '0 0 16px' }}>
        {heading}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {briefs.map(b => (
          <Link key={b.slug} href={`/briefs/${b.slug}`} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--surface-1)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '14px 20px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 5, display: 'flex', gap: 8 }}>
                <span style={{ color: accentColor, fontWeight: 600 }}>Edition #{b.edition}</span>
                <span>·</span>
                <span>{b.displayDate}</span>
              </div>
              <div style={{
                fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500,
                color: 'var(--ink)', lineHeight: 1.3,
              }}>
                {b.title}
              </div>
            </div>
          </Link>
        ))}
        <Link href="/briefs" style={{
          fontSize: 12, color: accentColor, fontWeight: 500, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
        }}>
          View all briefs →
        </Link>
      </div>
    </>
  )
}
