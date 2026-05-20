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

function FlashBadge({ time }: { time: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.6px',
      textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4,
      background: '#FFF3E0', color: '#B45309',
    }}>
      ⚡ Flash
    </span>
  )
}

export default async function ArticlesPage() {
  const articles = await getAllArticles()

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 500, color: 'var(--ink)', margin: '0 0 8px' }}>
          Flash Intelligence
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>
          Auto-published when MCX moves &gt;1% with a confirmed trigger. {articles.length} articles published.
        </p>
      </div>

      {articles.length === 0 ? (
        <div style={{
          padding: '48px 32px', textAlign: 'center',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>
            Standing by
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>
            Flash articles publish automatically when MCX moves significantly. Check back during market hours.
          </p>
        </div>
      ) : (
        articles.map(article => (
          <Link
            key={article.slug}
            href={`/articles/${article.slug}`}
            style={{ display: 'block', textDecoration: 'none', padding: '20px 0', borderBottom: '1px solid var(--border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <FlashBadge time={article.time} />
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

            {article.priceAtPublish > 0 && (
              <span style={{
                display: 'inline-block', marginTop: 10,
                fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)',
              }}>
                Price at publish: ₹{article.priceAtPublish.toLocaleString('en-IN')}
              </span>
            )}
          </Link>
        ))
      )}
    </div>
  )
}
