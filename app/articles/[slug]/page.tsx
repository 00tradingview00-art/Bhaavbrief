import { getAllArticles, getArticleBySlug } from '@/lib/articles'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import CopyLinkButton from '@/components/CopyLinkButton'

// Allow slugs not pre-rendered at build time (new articles published by GitHub Actions)
export const dynamicParams = true

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
        {meta.edition === 'hawk-scan' ? (
          <div style={{
            background: '#0E0806',
            border: '1px solid rgba(255,68,68,0.3)',
            borderLeft: '4px solid #FF4444',
            borderRadius: 8,
            padding: '20px 24px',
            marginBottom: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase', padding: '3px 10px', fontWeight: 700,
                background: '#1A0A0A', color: '#FF4444', border: '0.5px solid #FF4444',
              }}>
                ⚡ HAWK-SCAN
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase',
                padding: '3px 8px', background: `${color}20`, color,
                fontFamily: 'var(--font-mono)',
              }}>
                {meta.commodity.toUpperCase()}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                {meta.date && new Date(meta.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {meta.time && ` · ${meta.time} IST`}
              </span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700,
              lineHeight: 1.2, letterSpacing: '-0.3px', color: '#FFFFFF', margin: 0,
            }}>
              {meta.title}
            </h1>
          </div>
        ) : (
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
        )}

        {/* Article body */}
        <div style={{
          fontSize: 16, lineHeight: 1.8, color: 'var(--ink-2)',
          fontFamily: 'var(--font-sans)',
        }} className={meta.edition === 'hawk-scan' ? 'article-body hawk-scan-body' : 'article-body'}>
          <MDXRemote source={content} />
        </div>

        {/* Share */}
        <div style={{
          marginTop: 36, padding: '14px 20px',
          background: 'var(--surface-3)',
          border: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', color: 'var(--ink-3)' }}>
            Found this useful? Share with your trading circle.
          </span>
          <CopyLinkButton url={`https://bhaavbrief.in/articles/${slug}`} title={meta.title} />
        </div>

        {/* Disclaimer */}
        <div style={{
          marginTop: 16, padding: '16px 20px',
          background: 'var(--surface-3)', borderRadius: 8,
          fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--ink-3)' }}>Disclaimer:</strong> BhaavBrief is for educational and informational purposes only. We are not registered with SEBI or any other regulatory authority. Nothing on this platform constitutes investment advice, a recommendation, or a solicitation to buy or sell any security or commodity. All data and analysis is sourced from publicly available information. Past patterns are not indicative of future results. Commodity and equity trading involves substantial risk of loss. Please consult a SEBI-registered investment advisor or research analyst before making any financial decisions.
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

        /* Hawk-Scan body: monospace structured format */
        .hawk-scan-body {
          font-family: var(--font-mono);
          font-size: 14px;
          line-height: 1.9;
          color: var(--ink-2);
        }
        .hawk-scan-body p {
          margin-bottom: 8px;
        }
        .hawk-scan-body strong {
          color: var(--ink);
          font-weight: 600;
          letter-spacing: 0.04em;
        }
      `}</style>
    </>
  )
}
