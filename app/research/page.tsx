import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllResearch } from '@/lib/research'
import Card from '@/components/ui/Card'
import { safeJsonLd } from '@/lib/seo'

export const revalidate = 900

export const metadata: Metadata = {
  title:       'Pro Research — BhaavBrief',
  description: 'Macro event analysis for MCX traders — FOMC, Jackson Hole, EIA, RBI MPC — with commodity-specific implications and options positioning notes.',
  alternates: { canonical: 'https://bhaavbrief.in/research' },
}

export default function ResearchIndexPage() {
  const articles = getAllResearch()

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type':     'CollectionPage',
        '@id':       'https://bhaavbrief.in/research',
        name:        'Pro Research',
        description: 'Macro event analysis for MCX traders — FOMC, Jackson Hole, EIA, RBI MPC — with commodity-specific implications and options positioning notes.',
        url:         'https://bhaavbrief.in/research',
      },
      {
        '@type': 'ItemList',
        // Only published articles — an unpublished slug 404s (see
        // app/research/[slug]/page.tsx), and structured data pointing at a
        // dead link is a real Search Console flag, not just a style nit.
        itemListElement: articles.filter(a => a.published).slice(0, 20).map((a, i) => ({
          '@type':  'ListItem',
          position: i + 1,
          url:      `https://bhaavbrief.in/research/${a.slug}`,
          name:     a.title,
        })),
      },
    ],
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem 4rem', fontFamily: 'var(--font-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        Pro Research
      </h1>
      <p style={{ fontSize: '0.88rem', color: 'var(--ink-3)', marginBottom: '2rem' }}>
        Macro event analysis — FOMC, Jackson Hole, EIA, RBI MPC — with MCX-specific implications
        and options positioning notes.
      </p>

      {articles.length === 0 ? (
        <p style={{ fontSize: '0.9rem', color: 'var(--ink-3)' }}>
          No research articles published yet — check back soon.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          {articles.map(a => (
            <Link key={a.slug} href={`/research/${a.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <Card padding="md" hoverLift>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--ink-3)' }}>{a.displayDate}</span>
                  {a.premium && (
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--gold-pale)', color: 'var(--gold-dark)', border: '0.5px solid var(--gold)', padding: '2px 8px', fontWeight: 600 }}>
                      🔒 Pro
                    </span>
                  )}
                  {a.commodities.map(c => (
                    <span key={c} style={{ fontSize: '0.65rem', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {c}
                    </span>
                  ))}
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.35rem' }}>
                  {a.title}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>
                  {a.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
