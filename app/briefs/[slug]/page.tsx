import { notFound }    from 'next/navigation'
import { Metadata }    from 'next'
import { MDXRemote }   from 'next-mdx-remote/rsc'
import SubscribeForm   from '@/components/SubscribeForm'
import { getBrief, getAllBriefs, formatDate } from '@/lib/briefs'

export const revalidate = 3600

const BASE_URL = 'https://bhaavbrief.in'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const brief = getBrief(slug)
  if (!brief) return { title: 'Brief not found' }

  const title       = `${brief.title} | BhaavBrief`
  const description = brief.summary || `MCX commodity intelligence brief. ${brief.commodities?.join(', ')} analysis for Indian traders.`
  const url         = `${BASE_URL}/briefs/${brief.slug}`
  const image       = `${BASE_URL}/og/briefs/${brief.slug}.png`

  return {
    title,
    description,
    keywords: [
      ...(brief.commodities ?? []).map(c => `${c} analysis India`),
      ...(brief.commodities ?? []).map(c => `${c} price today`),
      'MCX commodity analysis',
      'commodity intelligence India',
      'BhaavBrief',
      ...(brief.tags ?? []),
    ].join(', '),
    alternates: { canonical: url },
    openGraph: {
      type:        'article',
      url,
      title,
      description,
      siteName:    'BhaavBrief',
      locale:      'en_IN',
      publishedTime: brief.date,
      authors:     ['BhaavBrief'],
      tags:        [...(brief.tags ?? []), ...(brief.commodities ?? [])],
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image], site: '@bhaavbrief' },
  }
}

export async function generateStaticParams() {
  return (await getAllBriefs()).map(b => ({ slug: b.slug }))
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

  const tag      = brief.tags?.[0]?.toLowerCase() ?? 'default'
  const tagStyle = TAG_STYLES[tag] ?? TAG_STYLES.default
  const url      = `${BASE_URL}/briefs/${brief.slug}`

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
    author: [{ '@type': 'Organization', name: 'BhaavBrief', url: BASE_URL }],
    publisher: {
      '@type': 'Organization', name: 'BhaavBrief', url: BASE_URL,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
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
              <a href={crumb.href} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#C8720A', textDecoration: 'none', letterSpacing: '0.04em' }}>{crumb.label}</a>
            ) : (
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>{crumb.label}</span>
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
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', border: `0.5px solid ${tagStyle.borderColor}`, background: tagStyle.background as string, color: tagStyle.color as string }}>
                  {brief.tags?.[0] ?? 'Brief'}
                </span>
                <time dateTime={brief.date} itemProp="datePublished" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.05em' }}>
                  {formatDate(brief.date)}
                </time>
              </div>
              <h1 itemProp="headline" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: '0.75rem' }}>
                {brief.title}
              </h1>
              {brief.summary && (
                <p itemProp="description" style={{ fontSize: '1rem', color: '#48483A', lineHeight: 1.7, fontWeight: 300, paddingLeft: '1rem', borderLeft: '0.5px solid #C8C8B8', margin: 0 }}>
                  {brief.summary}
                </p>
              )}
              {brief.commodities?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  {brief.commodities.map(c => (
                    <span key={c} itemProp="keywords" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#8A8A7A', background: '#F3F2EC', padding: '2px 8px' }}>{c}</span>
                  ))}
                </div>
              )}
              <span itemProp="publisher" itemScope itemType="https://schema.org/Organization" style={{ display: 'none' }}>
                <span itemProp="name">BhaavBrief</span>
                <span itemProp="url">{BASE_URL}</span>
              </span>
            </header>

            <div className="brief-prose" itemProp="articleBody">
              <MDXRemote source={brief.content} />
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#F3F2EC', border: '0.5px solid #DDDDD0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.04em', color: '#48483A' }}>Found this useful? Share it with your trading circle.</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(brief.title)}&url=${encodeURIComponent(url)}&via=bhaavbrief`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.04em', color: '#FAFAF6', background: '#18180F', padding: '6px 14px', textDecoration: 'none' }}>Share on X</a>
                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${brief.title} — ${url}`)}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.04em', color: '#fff', background: '#25D366', padding: '6px 14px', textDecoration: 'none' }}>Share on WhatsApp</a>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '0.5px solid #DDDDD0' }}>
              <a href="/briefs" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '0.05em', color: '#C8720A', textDecoration: 'none', borderBottom: '1px solid #C8720A', paddingBottom: 1 }}>← All editions</a>
            </div>
          </article>
        </main>

        <aside className="brief-sidebar" style={{ borderLeft: '0.5px solid #DDDDD0', paddingLeft: '2rem', alignSelf: 'start' }}>
          <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <SubscribeForm />
          </div>
          <div style={{ background: '#18180F', padding: '1.25rem', color: '#FAFAF6' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A', marginBottom: '0.75rem' }}>Not SEBI registered</div>
            <p style={{ fontSize: 11, color: 'rgba(250,250,246,0.55)', lineHeight: 1.6, fontWeight: 300, margin: 0 }}>BhaavBrief is for informational and educational purposes only. This is not investment advice. Always conduct your own research before making any trading or investment decisions.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
