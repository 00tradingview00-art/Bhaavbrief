import { getAllEvents, getEventBySlug } from '@/lib/events'
import { getAllBriefs } from '@/lib/briefs'
import { COMMODITY_URL_SLUGS, COMMODITY_LABELS } from '@/lib/eventMap'
import { COMMODITY_ACCENT_COLORS } from '@/lib/commodityTags'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import CopyLinkButton from '@/components/CopyLinkButton'

export const dynamicParams = true
// P-03: without this, a slug rendered on-demand (dynamicParams path) caches
// forever with no revalidate timer. HOURLY tier (config/revalidate.mjs).
export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const events = await getAllEvents()
  return events.map(e => ({ slug: e.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return {}

  const canonical = `https://bhaavbrief.in/events/${slug}`
  return {
    title:       event.title,
    description: event.description,
    alternates:  { canonical },
    openGraph: {
      title:         event.title,
      description:   event.description,
      url:           canonical,
      siteName:      'BhaavBrief',
      type:          'article',
      publishedTime: event.date,
    },
    twitter: {
      card:        'summary_large_image',
      title:       event.title,
      description: event.description,
    },
  }
}

export default async function EventResultPage({ params }: Props) {
  const { slug } = await params
  const [event, recentBriefs] = await Promise.all([
    getEventBySlug(slug),
    getAllBriefs().then(b => b.slice(0, 3)),
  ])
  if (!event) notFound()

  const color        = COMMODITY_ACCENT_COLORS[event.commodity as keyof typeof COMMODITY_ACCENT_COLORS] ?? '#7A7668'
  const commoditySlug = COMMODITY_URL_SLUGS[event.commodity]
  const commodityLabel = COMMODITY_LABELS[event.commodity] ?? event.commodity
  const up           = event.mcxChangePct >= 0
  const eventUrl     = `https://bhaavbrief.in/events/${slug}`

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type':       'NewsArticle',
        headline:      event.title,
        description:   event.description,
        datePublished: event.date,
        dateModified:  event.date,
        url:           eventUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': eventUrl },
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
          { '@type': 'ListItem', position: 1, name: 'Home',   item: 'https://bhaavbrief.in' },
          { '@type': 'ListItem', position: 2, name: 'Events', item: 'https://bhaavbrief.in/events' },
          { '@type': 'ListItem', position: 3, name: event.title, item: eventUrl },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <article style={{ maxWidth: 720 }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>Home</Link>
          <span>›</span>
          <Link href="/events" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>Events</Link>
          <span>›</span>
          <span style={{ color: 'var(--ink-3)' }}>{commodityLabel}</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase',
              padding: '3px 8px', borderRadius: 4, background: `${color}15`, color,
            }}>
              {commodityLabel}
            </span>
            <span style={{
              fontSize: 11, color: 'var(--ink-4)', padding: '2px 7px', borderRadius: 4,
              background: 'var(--surface-3)', fontFamily: 'var(--font-mono)',
            }}>
              {event.eventName}
            </span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 500,
            lineHeight: 1.2, letterSpacing: '-0.3px', color: 'var(--ink)', margin: '0 0 14px',
          }}>
            {event.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 15, color: 'var(--ink-4)' }}>
            <span>BhaavBrief Event Log</span>
            <span>·</span>
            <span>{event.displayDate}</span>
          </div>
        </div>

        {/* Result + MCX move at print */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
          background: 'var(--border)', border: '1px solid var(--border)',
          borderRadius: 6, overflow: 'hidden', marginBottom: 28,
        }}>
          <div style={{ background: 'var(--surface-1)', padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
              Result
            </div>
            <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              {event.result}
            </div>
          </div>
          <div style={{ background: 'var(--surface-1)', padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
              MCX {commodityLabel} at print
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
                ₹{event.mcxPrice.toLocaleString('en-IN')}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
                color: up ? '#16A34A' : '#DC2626',
              }}>
                {up ? '▲' : '▼'} {Math.abs(event.mcxChangePct).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Mechanism */}
        {event.mechanism && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500,
              color: 'var(--ink)', margin: '0 0 10px',
            }}>
              Why it moves MCX {commodityLabel}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--ink-2)' }}>
              {event.mechanism}
            </p>
          </div>
        )}

        {/* Related coverage */}
        {event.relatedArticleSlug && (
          <div style={{ marginBottom: 28 }}>
            <Link href={`/articles/${event.relatedArticleSlug}`} style={{ textDecoration: 'none' }}>
              <div style={{
                border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)',
                borderRadius: '0 4px 4px 0', padding: '12px 16px',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Full coverage →
                </span>
              </div>
            </Link>
          </div>
        )}

        {commoditySlug && (
          <div style={{ marginBottom: 28 }}>
            <Link href={`/commodities/${commoditySlug}`} style={{ fontSize: 14, color: 'var(--gold)', textDecoration: 'none' }}>
              View live MCX {commodityLabel} price and intelligence →
            </Link>
          </div>
        )}

        {/* Share */}
        <div style={{
          marginTop: 36, padding: '14px 20px', background: 'var(--surface-3)',
          border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', color: 'var(--ink-3)' }}>
            Found this useful? Share with your trading circle.
          </span>
          <CopyLinkButton url={eventUrl} title={event.title} location="event_page" />
        </div>

        {/* More from BhaavBrief */}
        {recentBriefs.length > 0 && (
          <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500,
              color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              More from BhaavBrief
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentBriefs.map(b => (
                <Link key={b.urlSlug} href={`/briefs/${b.urlSlug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 14, paddingTop: 8, paddingBottom: 8 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', marginBottom: 4 }}>
                      {b.date && new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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

        <div style={{ marginTop: 32 }}>
          <Link href="/events" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 15, color: 'var(--gold)', textDecoration: 'none', fontWeight: 500,
          }}>
            ← All Event Results
          </Link>
        </div>
      </article>
    </>
  )
}
