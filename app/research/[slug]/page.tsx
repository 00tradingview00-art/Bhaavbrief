import { getResearchBySlug } from '@/lib/research'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/seo'
import ProBlurGate from '@/components/ProBlurGate'

// Deliberately not ISR/SSG: this page's render branches structurally on
// isProUser() (full article vs. teaser+blur). generateStaticParams would
// pre-render at build time with no request context, so isPro would always
// resolve false and a real Pro subscriber would never receive the full
// <MDXRemote> content — only the teaser ever gets rendered into the HTML for
// anyone to reveal client-side. Confirmed: adding force-dynamic alongside a
// still-present generateStaticParams did NOT change the build's SSG output
// for this route on Next 15.5.20 (verified via a clean `npm run build`), so
// generateStaticParams is removed entirely rather than left in place.
// force-dynamic re-runs the Pro check per request (same pattern already used
// by app/options/strategy/page.tsx); anonymous/crawler requests still get the
// teaser-only server render, unchanged.
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = getResearchBySlug(slug)
  if (!article) return {}

  const { meta } = article
  const canonical = `https://bhaavbrief.in/research/${slug}`

  return {
    title:       `${meta.title} — BhaavBrief Pro`,
    description: meta.description,
    keywords:    meta.tags,
    robots:      { index: true, follow: true },
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

// Splits the raw MDX source into a free "teaser" and a Pro-only "rest" —
// at block boundaries (blank lines), never mid-syntax — so both halves
// stay valid MDX and render through the same <MDXRemote> pipeline as the
// full Pro article (real headings, bold, italics), instead of the teaser
// being flattened to plain text. Previously getTeaserWords() stripped all
// markdown to a single <p> before the word-count cut, which is why the
// free view looked structurally different from the Pro view of the same
// article — same content, but one properly formatted and one not.
function splitMDXTeaser(content: string, wordLimit = 300): { teaser: string; rest: string } {
  const blocks = content.trim().split(/\n{2,}/)
  let wordCount = 0
  let cut = blocks.length
  for (let i = 0; i < blocks.length; i++) {
    wordCount += blocks[i].split(/\s+/).filter(Boolean).length
    if (wordCount >= wordLimit) { cut = i + 1; break }
  }
  return {
    teaser: blocks.slice(0, cut).join('\n\n'),
    rest:   blocks.slice(cut).join('\n\n'),
  }
}

export default async function ResearchSlugPage({ params }: Props) {
  const { slug } = await params
  const article = getResearchBySlug(slug)
  if (!article) notFound()

  const { meta, content } = article
  const { userId } = await auth()
  const isPro = await isProUser(userId)

  const articleUrl = `https://bhaavbrief.in/research/${slug}`

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
        isAccessibleForFree: false,
        hasPart: {
          '@type':              'WebPageElement',
          isAccessibleForFree: false,
          cssSelector:         '.pro-content',
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
        author:    [{ '@type': 'Person', name: 'Prabal' }],
        publisher: {
          '@type': 'Organization',
          name:    'BhaavBrief',
          url:     'https://bhaavbrief.in',
          logo:    { '@type': 'ImageObject', url: 'https://bhaavbrief.in/logo.png', width: 200, height: 60 },
        },
        keywords: meta.tags.join(', '),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home',     item: 'https://bhaavbrief.in' },
          { '@type': 'ListItem', position: 2, name: 'Research', item: 'https://bhaavbrief.in/research' },
          { '@type': 'ListItem', position: 3, name: meta.title, item: articleUrl },
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

      <article style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginBottom: '1.25rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
          <span>›</span>
          <Link href="/news" style={{ color: 'inherit', textDecoration: 'none' }}>Feed</Link>
          <span>›</span>
          <span>{meta.commodities.length > 0 ? meta.commodities[0].charAt(0).toUpperCase() + meta.commodities[0].slice(1) : 'Macro'}</span>
        </div>

        {/* Header */}
        <header style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--ink)', color: '#fff', padding: '2px 7px', borderRadius: 99 }}>
              Pro Research
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>{meta.displayDate}</span>
            {meta.commodities.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>
                · {meta.commodities.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
              </span>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>{meta.readingMinutes} min read</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.25, margin: '0 0 0.6rem' }}>
            {meta.title}
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--ink-3)', margin: 0, lineHeight: 1.6 }}>
            {meta.description}
          </p>
        </header>

        {isPro ? (
          <div className="pro-content" style={{ fontSize: '0.92rem', color: 'var(--ink-2)', lineHeight: 1.75 }}>
            <MDXRemote source={content} />
          </div>
        ) : (
          (() => {
            const { teaser, rest } = splitMDXTeaser(content, 300)
            return (
              <>
                {/* Teaser: real MDX, same rendering as the Pro article — just
                    the first ~300 words — always server-rendered so Google
                    can index it. */}
                <div style={{ fontSize: '0.92rem', color: 'var(--ink-2)', lineHeight: 1.75, marginBottom: '1.5rem' }}>
                  <MDXRemote source={teaser} />
                </div>

                {/* Paywall gate — the real remaining article, blurred, not a
                    fake/flattened placeholder. */}
                {rest.trim().length > 0 && (
                  <ProBlurGate isPro={isPro} label="Full analysis — strategy, levels, options positioning">
                    <div style={{ fontSize: '0.92rem', color: 'var(--ink-2)', lineHeight: 1.75, maxHeight: 260, overflow: 'hidden' }}>
                      <MDXRemote source={rest} />
                    </div>
                  </ProBlurGate>
                )}
              </>
            )
          })()
        )}

        {/* Footer */}
        <footer style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--ink-3)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span>By Prabal · BhaavBrief</span>
          {meta.displayDate && <span>{meta.displayDate}</span>}
          <Link href="/news" style={{ color: 'var(--gold)', fontWeight: 600 }}>← Back to Feed</Link>
        </footer>
      </article>
    </>
  )
}
