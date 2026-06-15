import { notFound, redirect } from 'next/navigation'
import { Metadata }           from 'next'
import Link                   from 'next/link'
import { MDXRemote }          from 'next-mdx-remote/rsc'
import remarkGfm              from 'remark-gfm'
import SubscribeForm          from '@/components/SubscribeForm'
import CopyLinkButton         from '@/components/CopyLinkButton'
import { getBrief, getAllBriefs, getPrevNextBriefs, formatDate } from '@/lib/briefs'
import { getBriefArcs } from '@/lib/arcs'

const COMMODITY_PAGE_MAP: Record<string, { slug: string; label: string }> = {
  'MCX Gold':        { slug: 'gold',        label: 'MCX Gold' },
  'MCX Silver':      { slug: 'silver',      label: 'MCX Silver' },
  'MCX Crude':       { slug: 'crude-oil',   label: 'MCX Crude Oil' },
  'MCX Copper':      { slug: 'copper',      label: 'MCX Copper' },
  'MCX Natural Gas': { slug: 'natural-gas', label: 'MCX Natural Gas' },
}

export const revalidate = 3600

const BASE_URL = 'https://bhaavbrief.in'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const brief = getBrief(slug)
  if (!brief) return { title: 'Brief not found' }

  const title       = brief.title
  const description = brief.description || brief.summary || `MCX commodity intelligence — ${(brief.tags ?? []).join(', ')} analysis for Indian traders.`
  const url         = `${BASE_URL}/briefs/${brief.urlSlug}`

  const ogParams = new URLSearchParams({
    title:   brief.title,
    edition: String(brief.edition ?? ''),
    date:    brief.displayDate ?? brief.date ?? '',
    tags:    (brief.tags ?? []).slice(0, 3).join(','),
  })
  const ogImage = `${BASE_URL}/api/og?${ogParams}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type:          'article',
      url,
      title,
      description,
      siteName:      'BhaavBrief',
      locale:        'en_IN',
      publishedTime: brief.date,
      authors:       ['BhaavBrief'],
      tags:          brief.tags ?? [],
      images:        [{ url: ogImage, width: 1200, height: 630, alt: brief.title }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      site:        '@bhaavbrief',
      images:      [ogImage],
    },
  }
}

export async function generateStaticParams() {
  const briefs = await getAllBriefs()
  // Generate routes for SEO urlSlugs (primary) + edition-XXX filename slugs (redirect targets)
  return briefs.flatMap(b => {
    const params: { slug: string }[] = [{ slug: b.urlSlug }]
    if (b.slug !== b.urlSlug) params.push({ slug: b.slug })
    return params
  })
}

const TAG_STYLES: Record<string, React.CSSProperties> = {
  energy:  { background: '#FFF7E0', color: '#996600', borderColor: '#D4A830' },
  metals:  { background: '#EAF5EE', color: '#1E6630', borderColor: '#5AAA70' },
  agri:    { background: '#FDF0F0', color: '#991818', borderColor: '#D07070' },
  macro:   { background: '#F3F2EC', color: '#48483A', borderColor: '#C8C8B8' },
  default: { background: '#F3F2EC', color: '#48483A', borderColor: '#C8C8B8' },
}

export default async function BriefPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brief = getBrief(slug)
  if (!brief || !brief.published) notFound()

  // Permanent redirect from old edition-XXX slugs to SEO-friendly URL
  if (slug !== brief.urlSlug) redirect(`/briefs/${brief.urlSlug}`)

  const { prev, next } = getPrevNextBriefs(brief.urlSlug)

  const tag      = brief.tags?.[0]?.toLowerCase() ?? 'default'
  const tagStyle = TAG_STYLES[tag] ?? TAG_STYLES.default
  const url      = `${BASE_URL}/briefs/${brief.urlSlug}`
  const arcs     = getBriefArcs(brief.edition)

  const ogParams = new URLSearchParams({
    title:   brief.title,
    edition: String(brief.edition ?? ''),
    date:    brief.displayDate ?? brief.date ?? '',
    tags:    (brief.tags ?? []).slice(0, 3).join(','),
  })
  const ogImage = `${BASE_URL}/api/og?${ogParams}`

  const articleSchema = {
    '@context':          'https://schema.org',
    '@type':              'NewsArticle',
    headline:             brief.title,
    description:          brief.summary,
    datePublished:        brief.date,
    dateModified:         brief.date,
    url,
    isAccessibleForFree:  true,
    inLanguage:           'en-IN',
    keywords:             [...(brief.tags ?? []), ...(brief.commodities ?? [])].join(', '),
    articleSection:       brief.tags?.[0] ?? 'Commodities',
    image: [{ '@type': 'ImageObject', url: ogImage, width: 1200, height: 630 }],
    author: [{ '@type': 'Organization', name: 'BhaavBrief', url: BASE_URL }],
    publisher: {
      '@type': 'Organization', name: 'BhaavBrief', url: BASE_URL,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png`, width: 500, height: 500 },
    },
    about: (brief.commodities ?? []).map(c => ({ '@type': 'Thing', name: c })),
    mentions: [
      { '@type': 'Organization', name: 'MCX', alternateName: 'Multi Commodity Exchange' },
      { '@type': 'Organization', name: 'NCDEX', alternateName: 'National Commodity & Derivatives Exchange' },
    ],
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',   item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Briefs', item: `${BASE_URL}/briefs` },
      { '@type': 'ListItem', position: 3, name: brief.title, item: url },
    ],
  }

  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <nav aria-label="Breadcrumb" style={{ maxWidth: 980, margin: '0 auto', padding: '0.75rem 1.25rem', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { label: 'Home',   href: '/' },
          { label: 'Briefs', href: '/briefs' },
          { label: formatDate(brief.date), href: null },
        ].map((crumb, i, arr) => (
          <span key={crumb.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {crumb.href ? (
              <a href={crumb.href} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C8720A', textDecoration: 'none', letterSpacing: '0.04em' }}>{crumb.label}</a>
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>{crumb.label}</span>
            )}
            {i < arr.length - 1 && <span style={{ color: '#C8C8B8', fontSize: 10 }}>›</span>}
          </span>
        ))}
      </nav>

      <div className="layout-brief-page" style={{ maxWidth: 980, margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
        <main>
          <article itemScope itemType="https://schema.org/NewsArticle">
            <header style={{ paddingBottom: '1.5rem', marginBottom: '1.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', border: `0.5px solid ${tagStyle.borderColor}`, background: tagStyle.background as string, color: tagStyle.color as string }}>
                  {brief.tags?.[0] ?? 'Brief'}
                </span>
                <time dateTime={brief.date} itemProp="datePublished" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.05em' }}>
                  {formatDate(brief.date)}
                </time>
              </div>
              <h1 itemProp="headline" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: '0.75rem' }}>
                {brief.title}
              </h1>
              {brief.summary && (
                <p itemProp="description" style={{ fontSize: '1rem', color: '#48483A', lineHeight: 1.7, fontWeight: 300, paddingLeft: '1rem', borderLeft: '0.5px solid #C8C8B8', margin: 0 }}>
                  {brief.summary}
                </p>
              )}
              {brief.commodities?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  {brief.commodities.map(c => {
                    const page = COMMODITY_PAGE_MAP[c]
                    const style: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', background: '#F3F2EC', padding: '2px 8px' }
                    return page ? (
                      <Link key={c} href={`/commodities/${page.slug}`} itemProp="keywords" style={{ ...style, color: '#C8720A', textDecoration: 'none' }}>{c}</Link>
                    ) : (
                      <span key={c} itemProp="keywords" style={style}>{c}</span>
                    )
                  })}
                </div>
              )}
              <span itemProp="publisher" itemScope itemType="https://schema.org/Organization" style={{ display: 'none' }}>
                <span itemProp="name">BhaavBrief</span>
                <span itemProp="url">{BASE_URL}</span>
              </span>
            </header>

            {/* Story arc banner */}
            {arcs.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                {arcs.map(arc => (
                  <Link key={arc.id} href={`/arcs/${arc.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{
                      border: '1px solid rgba(181,134,42,0.4)',
                      borderLeft: '3px solid var(--gold)',
                      background: 'var(--gold-pale)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      borderRadius: '0 4px 4px 0',
                    }}>
                      <div>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--gold)',
                          fontWeight: 700,
                          marginRight: 8,
                        }}>
                          {arc.status === 'active' ? `DAY ${arc.latestDay} OF` : 'STORY ARC'}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          color: 'var(--ink-2)',
                          fontWeight: 500,
                        }}>
                          {arc.title}
                        </span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', flexShrink: 0 }}>
                        Full story →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="brief-prose" itemProp="articleBody">
              <MDXRemote source={brief.content} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#F3F2EC', border: '0.5px solid #DDDDD0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', color: '#48483A' }}>Found this useful? Share it with your trading circle.</span>
              <CopyLinkButton url={url} title={brief.title} />
            </div>

            {/* Prev / Next navigation */}
            <nav aria-label="Edition navigation" style={{
              marginTop: '2rem', paddingTop: '1.5rem', borderTop: '0.5px solid #DDDDD0',
              display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center',
            }}>
              {/* Older edition */}
              <div>
                {prev && (
                  <Link href={`/briefs/${prev.urlSlug}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                      ← Previous edition
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C8720A', lineHeight: 1.4 }}>
                      #{String(prev.edition).padStart(3,'0')} · {prev.displayDate.split(',')[0]}
                    </div>
                    <div style={{ fontSize: 12, color: '#48483A', lineHeight: 1.4, marginTop: 2, fontWeight: 500 }}>
                      {prev.title}
                    </div>
                  </Link>
                )}
              </div>

              {/* All editions */}
              <div style={{ textAlign: 'center' }}>
                <Link href="/briefs" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '0.5px solid #C8C8B8', paddingBottom: 1 }}>
                  All editions
                </Link>
              </div>

              {/* Newer edition */}
              <div style={{ textAlign: 'right' }}>
                {next && (
                  <Link href={`/briefs/${next.urlSlug}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                      Next edition →
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C8720A', lineHeight: 1.4 }}>
                      #{String(next.edition).padStart(3,'0')} · {next.displayDate.split(',')[0]}
                    </div>
                    <div style={{ fontSize: 12, color: '#48483A', lineHeight: 1.4, marginTop: 2, fontWeight: 500 }}>
                      {next.title}
                    </div>
                  </Link>
                )}
              </div>
            </nav>
          </article>
        </main>

        <aside className="brief-sidebar" style={{ borderLeft: '0.5px solid #DDDDD0', paddingLeft: '2rem', alignSelf: 'start' }}>
          <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <SubscribeForm location="brief_page" />
          </div>

          {/* Commodity page links for commodities covered in this brief */}
          {(() => {
            const pages = (brief.commodities ?? [])
              .map(c => COMMODITY_PAGE_MAP[c])
              .filter(Boolean) as { slug: string; label: string }[]
            if (pages.length === 0) return null
            return (
              <div style={{ border: '0.5px solid #DDDDD0', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A7A', marginBottom: '0.75rem' }}>
                  Commodity Pages
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pages.map(p => (
                    <Link key={p.slug} href={`/commodities/${p.slug}`} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: '#C8720A', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 0', borderBottom: '0.5px solid #DDDDD0',
                    }}>
                      <span>{p.label}</span>
                      <span style={{ fontSize: 10, color: '#C8C8B8' }}>→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Learn section internal links */}
          <div style={{ border: '0.5px solid #DDDDD0', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A7A', marginBottom: '0.75rem' }}>
              Learn
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Why commodity prices move', href: '/learn' },
                { label: 'MCX lot sizes & margins',   href: '/learn' },
                { label: 'OPEC, Fed & geopolitics',   href: '/learn' },
                { label: 'How to hedge price risk',   href: '/learn' },
              ].map(l => (
                <Link key={l.label} href={l.href} style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: '#48483A', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0', borderBottom: '0.5px solid #DDDDD0',
                }}>
                  <span>{l.label}</span>
                  <span style={{ fontSize: 10, color: '#C8C8B8' }}>→</span>
                </Link>
              ))}
            </div>
          </div>

        </aside>
      </div>
    </div>
  )
}
