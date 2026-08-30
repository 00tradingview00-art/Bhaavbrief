import type { Metadata } from 'next'
import { getAllResearch } from '@/lib/research'
import { getAllArticles } from '@/lib/articles'
import Link from 'next/link'

export const revalidate = 3600

export const metadata: Metadata = {
  title:       'Pro Research — BhaavBrief',
  description: 'MCX-specific analysis of major macro events — FOMC, Jackson Hole, OPEC+, RBI MPC, and EIA — with live options chain data and actionable MCX commodity implications.',
  keywords:    [
    'MCX gold analysis FOMC India', 'MCX commodity research India',
    'Jackson Hole MCX gold impact', 'OPEC MCX crude analysis India',
    'RBI MPC MCX gold India', 'MCX macro event analysis',
  ],
}

const ANALYTICAL_EDITIONS = new Set(['hawk-scan', 'flash', 'keyword-brief'])

export default async function ResearchPage() {
  const research = getAllResearch()

  // When no dedicated research articles exist yet, fall back to our best analytical pieces
  const allArticles = research.length === 0 ? await getAllArticles() : []
  const fallbackArticles = allArticles
    .filter(a => a.edition && ANALYTICAL_EDITIONS.has(a.edition))
    .slice(0, 15)

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        Pro Research
      </h1>
      <p style={{ fontSize: '0.87rem', color: 'var(--ink-3)', marginBottom: '2rem', lineHeight: 1.55 }}>
        MCX-specific analysis of major macro events — FOMC, Jackson Hole, OPEC+, RBI MPC, EIA — with options chain data and actionable implications. Published within hours of each event.
      </p>

      {research.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          {research.map(a => (
            <ArticleCard
              key={a.slug}
              href={`/research/${a.slug}`}
              title={a.title}
              description={a.description}
              date={a.displayDate}
              commodities={a.commodities}
              readingMinutes={a.readingMinutes}
              badge="Pro"
            />
          ))}
        </div>
      )}

      {fallbackArticles.length > 0 && (
        <>
          {research.length === 0 && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--gold-pale)', borderRadius: 8, marginBottom: '1.5rem', fontSize: '0.82rem', color: 'var(--gold-dark)', border: '1px solid #E8D5A3' }}>
              Deep-dive Pro Research articles are published after major macro events. In the meantime, here are our best analytical pieces from the archive.
            </div>
          )}
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: '1rem' }}>
            Analytical Articles
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {fallbackArticles.map(a => (
              <ArticleCard
                key={a.slug}
                href={`/articles/${a.slug}`}
                title={a.title}
                description={a.description}
                date={a.displayDate}
                commodities={a.commodity ? [a.commodity] : []}
                readingMinutes={undefined}
                badge={a.edition === 'hawk-scan' ? 'Alert' : a.edition === 'flash' ? 'Flash' : 'Analysis'}
              />
            ))}
          </div>
        </>
      )}
    </main>
  )
}

function ArticleCard({ href, title, description, date, commodities, readingMinutes, badge }: {
  href: string
  title: string
  description: string
  date: string
  commodities: string[]
  readingMinutes?: number
  badge: string
}) {
  const badgeColor = badge === 'Pro'
    ? { background: 'var(--ink)', color: '#fff' }
    : badge === 'Alert'
    ? { background: 'var(--down-bg)', color: 'var(--down)' }
    : badge === 'Flash'
    ? { background: 'var(--up-bg)', color: 'var(--up)' }
    : { background: 'var(--surface-3)', color: 'var(--ink-3)' }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1rem 1.1rem', background: 'var(--surface)' }} className="research-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 99, ...badgeColor }}>
          {badge}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--ink-3)' }}>{date}</span>
        {commodities.length > 0 && (
          <span style={{ fontSize: '0.72rem', color: 'var(--ink-3)' }}>
            · {commodities.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
          </span>
        )}
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.4rem' }}>
        <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
          {title}
        </Link>
      </h2>
      <p style={{ fontSize: '0.83rem', color: 'var(--ink-3)', margin: '0 0 0.6rem', lineHeight: 1.5 }}>{description}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href={href} style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>
          Read →
        </Link>
        {readingMinutes && (
          <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>{readingMinutes} min read</span>
        )}
      </div>
    </div>
  )
}
