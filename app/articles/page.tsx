import { getAllArticles } from '@/lib/articles'
import Link from 'next/link'
import Tag from '@/components/Tag'

export const metadata = {
  title: 'Flash Intelligence — BhaavBrief',
  description: 'Real-time MCX commodity market intelligence. Auto-generated when markets move.',
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
              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0 }}>
                {article.description}
              </p>
            )}
          </Link>
        ))
      )}
    </div>
  )
}
