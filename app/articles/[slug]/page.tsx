import { getAllArticles, getArticleBySlug } from '@/lib/articles'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const articles = await getAllArticles()
  return articles.map(a => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) return {}

  const { meta } = article
  const canonical = `https://bhaavbrief.in/articles/${slug}`

  return {
    title:       `${meta.title} — BhaavBrief`,
    description: meta.description,
    alternates:  { canonical },
    openGraph: {
      title:       meta.title,
      description: meta.description,
      url:         canonical,
      siteName:    'BhaavBrief',
      type:        'article',
      publishedTime: meta.date,
      tags:        meta.tags,
    },
    twitter: {
      card:        'summary',
      title:       meta.title,
      description: meta.description,
    },
  }
}

const COMMODITY_COLORS: Record<string, string> = {
  gold:   '#B45309',
  silver: '#2B4FC7',
  crude:  '#7C3AED',
  copper: '#065F46',
  natgas: '#7C3AED',
  macro:  '#6B21A8',
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const { meta, content } = article
  const color = COMMODITY_COLORS[meta.commodity] ?? '#7A7668'

  // JSON-LD schema for SEO
  const schema = {
    '@context':      'https://schema.org',
    '@type':         'NewsArticle',
    headline:        meta.title,
    description:     meta.description,
    datePublished:   meta.date,
    publisher: {
      '@type': 'Organization',
      name:    'BhaavBrief',
      url:     'https://bhaavbrief.in',
    },
    mainEntityOfPage: {
      '@type': '@id',
      '@id':   `https://bhaavbrief.in/articles/${slug}`,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <article style={{ maxWidth: 720 }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>Home</Link>
          <span>›</span>
          <Link href="/articles" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>Flash Intelligence</Link>
          <span>›</span>
          <span style={{ color: 'var(--ink-3)' }}>{meta.commodity.charAt(0).toUpperCase() + meta.commodity.slice(1)}</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase',
              padding: '3px 8px', borderRadius: 4,
              background: `${color}15`, color,
            }}>
              {meta.commodity.toUpperCase()}
            </span>
            {meta.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} style={{
                fontSize: 11, color: 'var(--ink-4)',
                padding: '2px 7px', borderRadius: 4,
                background: 'var(--surface-3)',
              }}>
                {tag}
              </span>
            ))}
          </div>

          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 500,
            lineHeight: 1.2, letterSpacing: '-0.3px', color: 'var(--ink)', margin: '0 0 14px',
          }}>
            {meta.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--ink-4)' }}>
            <span>BhaavBrief Intelligence</span>
            <span>·</span>
            <span>{meta.date && new Date(meta.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {meta.time && <><span>·</span><span>{meta.time} IST</span></>}
          </div>
        </div>

        {/* Article body */}
        <div style={{
          fontSize: 16, lineHeight: 1.8, color: 'var(--ink-2)',
          fontFamily: 'var(--font-sans)',
        }} className="article-body">
          <MDXRemote source={content} />
        </div>

        {/* Disclaimer */}
        <div style={{
          marginTop: 40, padding: '16px 20px',
          background: 'var(--surface-3)', borderRadius: 8,
          fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--ink-3)' }}>Disclaimer:</strong> BhaavBrief is not SEBI registered. This is market intelligence for informational purposes only, not investment advice. Always verify prices on MCX before trading. Past price moves do not guarantee future performance.
        </div>

        {/* Back link */}
        <div style={{ marginTop: 32 }}>
          <Link href="/articles" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--gold)', textDecoration: 'none', fontWeight: 500,
          }}>
            ← All Flash Intelligence
          </Link>
        </div>
      </article>

      <style>{`
        .article-body h2 {
          font-family: var(--font-serif);
          font-size: 22px;
          font-weight: 500;
          color: var(--ink);
          margin: 28px 0 12px;
        }
        .article-body strong {
          color: var(--ink);
          font-weight: 600;
        }
        .article-body p {
          margin-bottom: 16px;
        }
        .article-body ul, .article-body ol {
          padding-left: 20px;
          margin-bottom: 16px;
        }
        .article-body li {
          margin-bottom: 6px;
        }
      `}</style>
    </>
  )
}
