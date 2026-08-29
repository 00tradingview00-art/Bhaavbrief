import { getAllResearch, getResearchBySlug } from '@/lib/research'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/seo'

export const dynamicParams = true
export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const articles = getAllResearch()
  return articles.map(a => ({ slug: a.slug }))
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

function getTeaserWords(content: string, wordLimit = 300): string {
  const plainish = content
    .replace(/---[\s\S]*?---/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/\n{2,}/g, '\n\n')
    .trim()

  const words = plainish.split(/\s+/)
  if (words.length <= wordLimit) return plainish
  return words.slice(0, wordLimit).join(' ') + '…'
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

      <article style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: '0.75rem', opacity: 0.55, marginBottom: '1.25rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
          <span>›</span>
          <Link href="/research" style={{ color: 'inherit', textDecoration: 'none' }}>Research</Link>
          <span>›</span>
          <span style={{ opacity: 0.7 }}>{meta.commodities.length > 0 ? meta.commodities[0].charAt(0).toUpperCase() + meta.commodities[0].slice(1) : 'Macro'}</span>
        </div>

        {/* Header */}
        <header style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#1a1a1a', color: '#fff', padding: '2px 7px', borderRadius: 99 }}>
              Pro Research
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.55 }}>{meta.displayDate}</span>
            {meta.commodities.length > 0 && (
              <span style={{ fontSize: '0.75rem', opacity: 0.55 }}>
                · {meta.commodities.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
              </span>
            )}
            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{meta.readingMinutes} min read</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.3, margin: '0 0 0.6rem' }}>
            {meta.title}
          </h1>
          <p style={{ fontSize: '0.88rem', opacity: 0.7, margin: 0, lineHeight: 1.6 }}>
            {meta.description}
          </p>
        </header>

        {isPro ? (
          <div className="pro-content" style={{ fontSize: '0.9rem', lineHeight: 1.75 }}>
            <MDXRemote source={content} />
          </div>
        ) : (
          <>
            {/* Teaser: always server-rendered so Google can index it */}
            <div style={{ fontSize: '0.9rem', lineHeight: 1.75, marginBottom: '1.5rem' }}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{getTeaserWords(content, 300)}</p>
            </div>

            {/* Paywall gate */}
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '1.5rem',
              textAlign: 'center',
              background: 'linear-gradient(to bottom, transparent, #f9fafb)',
            }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>🔒</div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.4rem' }}>
                This is a Pro Research article
              </h2>
              <p style={{ fontSize: '0.83rem', opacity: 0.65, margin: '0 0 1rem', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                MCX-specific event analysis, options chain data, and actionable implications — published within hours of the event. Pro subscribers get the full analysis.
              </p>
              <Link
                href="/pro"
                style={{
                  display: 'inline-block', background: '#1a1a1a', color: '#fff',
                  padding: '0.6rem 1.4rem', borderRadius: 8, fontSize: '0.88rem',
                  fontWeight: 700, textDecoration: 'none',
                }}
              >
                Unlock with Pro — ₹999/month
              </Link>
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', opacity: 0.5 }}>
                Already a subscriber?{' '}
                <Link href="/sign-in" style={{ color: 'inherit', fontWeight: 600 }}>Sign in</Link>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <footer style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6', fontSize: '0.75rem', opacity: 0.5, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span>By Prabal · BhaavBrief</span>
          {meta.displayDate && <span>{meta.displayDate}</span>}
          <Link href="/research" style={{ color: 'inherit' }}>← All Research</Link>
        </footer>
      </article>
    </>
  )
}
