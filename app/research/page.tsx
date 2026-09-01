import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllResearch } from '@/lib/research'
import Card from '@/components/ui/Card'

export const revalidate = 900

export const metadata: Metadata = {
  title:       'Pro Research — BhaavBrief',
  description: 'Macro event analysis for MCX traders — FOMC, Jackson Hole, EIA, RBI MPC — with commodity-specific implications and options positioning notes.',
  alternates: { canonical: 'https://bhaavbrief.in/research' },
}

export default function ResearchIndexPage() {
  const articles = getAllResearch()

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem 4rem', fontFamily: 'var(--font-sans)' }}>
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
