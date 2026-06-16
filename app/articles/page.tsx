import { getAllArticles } from '@/lib/articles'
import Link from 'next/link'
import Tag from '@/components/Tag'

export const revalidate = 60

export const metadata = {
  title: 'MCX Market Intelligence — Commodity Price Analysis | BhaavBrief',
  description: 'Real-time MCX commodity market analysis — why gold, crude oil, silver, copper and natural gas are moving today. Auto-generated intelligence updated every 15 minutes during market hours.',
  keywords: [
    'MCX commodity market analysis today',
    'why MCX gold moving today',
    'why MCX crude oil moving today',
    'MCX silver copper price analysis India',
    'MCX price alert commodity India',
    'MCX commodity intelligence real time',
    'commodity market move analysis India',
    'MCX hawk scan price alert',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/articles' },
  openGraph: {
    title: 'MCX Market Intelligence — Why Commodities Are Moving | BhaavBrief',
    description: 'Real-time MCX commodity intelligence — why gold, crude, silver and copper are moving. Updated every 15 minutes during market hours.',
    url: 'https://bhaavbrief.in/articles',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'MCX Market Intelligence | BhaavBrief', description: 'Why MCX gold, crude oil, silver and copper are moving — real-time analysis every 15 minutes.', site: '@bhaavbrief' },
}

const COMMODITY_TAG_MAP: Record<string, string> = {
  gold:   'metals',
  silver: 'metals',
  crude:  'energy',
  copper: 'metals',
  natgas: 'energy',
  macro:  'macro',
}

export default async function ArticlesPage() {
  const articles = await getAllArticles()

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>
          Flash Intelligence
        </h1>
      </div>

      {articles.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--ink-4)', padding: '48px 0' }}>
          No articles yet. Check back during market hours.
        </p>
      ) : (
        articles.map(article => (
          <Link
            key={article.slug}
            href={`/articles/${article.slug}`}
            style={{ display: 'block', textDecoration: 'none', padding: '20px 0', borderBottom: '1px solid var(--border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <Tag type={COMMODITY_TAG_MAP[article.commodity] ?? 'macro'}>
                {article.commodity.charAt(0).toUpperCase() + article.commodity.slice(1)}
              </Tag>
              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                {article.displayDate}{article.time ? ` · ${article.time} IST` : ''}
              </span>
            </div>

            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20, fontWeight: 500, lineHeight: 1.35,
              color: 'var(--ink)', margin: '0 0 7px',
            }}>
              {article.title}
            </h2>

            {article.description && (
              <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0 }}>
                {article.description}
              </p>
            )}
          </Link>
        ))
      )}
    </div>
  )
}
