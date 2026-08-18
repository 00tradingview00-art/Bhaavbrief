import { getAllArticles, getArticleBySlug } from '@/lib/articles'
import { getAllBriefs } from '@/lib/briefs'
import { COMMODITY_ACCENT_COLORS } from '@/lib/commodityTags'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import CopyLinkButton from '@/components/CopyLinkButton'
import { safeJsonLd } from '@/lib/seo'

// Allow slugs not pre-rendered at build time (new articles published by GitHub Actions)
export const dynamicParams = true
// P-03: without this, a slug rendered on-demand (dynamicParams path) caches
// forever with no revalidate timer — a correction to that article would
// never surface. HOURLY tier (config/revalidate.mjs) — content-detail pages
// are otherwise immutable once published.
export const revalidate = 3600

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
  const ogParams = new URLSearchParams({
    title: meta.title,
    tags:  (meta.tags ?? []).slice(0, 3).join(','),
    type:  'flash',
  })
  const ogImage = `https://bhaavbrief.in/api/og?${ogParams}`

  return {
    title:       meta.title,
    description: meta.description,
    robots:      { index: false, follow: false },
    alternates:  { canonical },
    openGraph: {
      title:       meta.title,
      description: meta.description,
      url:         canonical,
      siteName:    'BhaavBrief',
      type:        'article',
      publishedTime: meta.date,
      tags:        meta.tags,
      images:      [{ url: ogImage, width: 1200, height: 630, alt: meta.title }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       meta.title,
      description: meta.description,
      images:      [ogImage],
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const [article, recentBriefs] = await Promise.all([
    getArticleBySlug(slug),
    getAllBriefs().then(b => b.slice(0, 3)),
  ])
  if (!article) notFound()

  const { meta, content } = article
  const color = COMMODITY_ACCENT_COLORS[meta.commodity as keyof typeof COMMODITY_ACCENT_COLORS] ?? '#7A7668'
  const sectionLabel = meta.edition === 'evening-brief' ? 'MCX Close' : 'Flash Intelligence'

  // JSON-LD schema for SEO
  const articleUrl = `https://bhaavbrief.in/articles/${slug}`
  const ogParams = new URLSearchParams({
    title: meta.title,
    tags:  (meta.tags ?? []).slice(0, 3).join(','),
    type:  'flash',
  })
  const ogImage = `https://bhaavbrief.in/api/og?${ogParams}`
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type':       'NewsArticle',
        headline:      meta.title,
        description:   meta.description,
        datePublished: meta.date,
        dateModified:  meta.date,
        url:           articleUrl,
        image:         [{ '@type': 'ImageObject', url: ogImage, width: 1200, height: 630 }],
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
        author:    [{ '@type': 'Organization', name: 'BhaavBrief', url: 'https://bhaavbrief.in' }],
        publisher: {
          '@type': 'Organization',
          name:    'BhaavBrief',
          url:     'https://bhaavbrief.in',
          logo:    { '@type': 'ImageObject', url: 'https://bhaavbrief.in/logo.png', width: 200, height: 60 },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home',              item: 'https://bhaavbrief.in' },
          { '@type': 'ListItem', position: 2, name: sectionLabel, item: 'https://bhaavbrief.in/articles' },
          { '@type': 'ListItem', position: 3, name: meta.title,          item: articleUrl },
        ],
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
      />

      <article style={{ maxWidth: 720 }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>Home</Link>
          <span>›</span>
          <Link href="/articles" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>{sectionLabel}</Link>
          <span>›</span>
          <span style={{ color: 'var(--ink-3)' }}>{meta.commodity.charAt(0).toUpperCase() + meta.commodity.slice(1)}</span>
        </div>

        {/* Header */}
        {meta.edition === 'hawk-scan' ? (
          <div style={{
            background: '#0E0806',
            border: '1px solid rgba(255,68,68,0.3)',
            borderLeft: '4px solid #FF4444',
            borderRadius: 4,
            padding: '20px 24px',
            marginBottom: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
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
                {meta.date && new Date(meta.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 15, color: 'var(--ink-4)' }}>
              <span>BhaavBrief Intelligence</span>
              <span>·</span>
              <span>{meta.date && new Date(meta.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
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
          <CopyLinkButton url={`https://bhaavbrief.in/articles/${slug}`} title={meta.title} location="article_page" />
        </div>

        {/* More from BhaavBrief — related briefs */}
        {recentBriefs.length > 0 && (
          <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500,
              color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase',
              marginBottom: 16,
            }}>
              More from BhaavBrief
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentBriefs.map(b => (
                <Link key={b.urlSlug} href={`/briefs/${b.urlSlug}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    borderLeft: '3px solid var(--gold)',
                    paddingLeft: 14, paddingTop: 8, paddingBottom: 8,
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', marginBottom: 4 }}>
                      {b.date && new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--ink)', lineHeight: 1.4 }}>
                      {b.title}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back link */}
        <div style={{ marginTop: 32 }}>
          <Link href="/articles" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 15, color: 'var(--gold)', textDecoration: 'none', fontWeight: 500,
          }}>
            ← All {sectionLabel}
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
        /* Section label: paragraph whose only content is a bold element (e.g. **WHAT HAPPENED**) */
        .article-body p > strong:only-child {
          display: block;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--saffron);
          margin-bottom: 6px;
          margin-top: 1.75rem;
        }
        .article-body p:first-of-type > strong:only-child {
          margin-top: 0;
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

        /* Hawk-Scan body */
        .hawk-scan-body {
          font-family: var(--font-sans);
          font-size: 15px;
          line-height: 1.85;
          color: var(--ink-2);
        }
        .hawk-scan-body p {
          margin-bottom: 12px;
        }
        .hawk-scan-body strong {
          color: var(--ink);
          font-weight: 700;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
      `}</style>
    </>
  )
}
