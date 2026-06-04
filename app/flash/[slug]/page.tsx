import { notFound }      from 'next/navigation'
import { Metadata }      from 'next'
import { MDXRemote }     from 'next-mdx-remote/rsc'
import Masthead          from '@/components/Masthead'
import CopyLinkButton    from '@/components/CopyLinkButton'
import { getFlash, getAllFlash, getAdjacentFlash } from '@/lib/flash'

export const revalidate = 300

const BASE_URL = 'https://bhaavbrief.in'

const CAT_STYLES: Record<string, React.CSSProperties> = {
  energy: { background: '#FFF7E0', color: '#996600', borderColor: '#D4A830' },
  metals: { background: '#EAF5EE', color: '#1E6630', borderColor: '#5AAA70' },
  forex:  { background: '#EEF2FF', color: '#3730A3', borderColor: '#818CF8' },
  macro:  { background: '#F3F2EC', color: '#48483A', borderColor: '#C8C8B8' },
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const flash = getFlash(slug)
  if (!flash) return { title: 'Flash not found' }

  const title       = `${flash.title} | BhaavBrief`
  const firstPara   = flash.content.split('\n\n')[0].trim().replace(/\n/g, ' ')
  const description = firstPara.slice(0, 160) || `MCX ${flash.category} intelligence: ${flash.title}.`
  const url         = `${BASE_URL}/flash/${flash.slug}`

  const ogParams = new URLSearchParams({
    title:    flash.title,
    date:     flash.date ?? '',
    tags:     flash.category ?? '',
    type:     'flash',
  })
  const ogImage = `${BASE_URL}/api/og?${ogParams}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article', url, title, description,
      siteName: 'BhaavBrief', locale: 'en_IN',
      publishedTime: flash.date,
      authors: ['BhaavBrief'],
      images: [{ url: ogImage, width: 1200, height: 630, alt: flash.title }],
    },
    twitter: { card: 'summary_large_image', title, description, site: '@bhaavbrief', images: [ogImage] },
  }
}

export async function generateStaticParams() {
  return getAllFlash().map(f => ({ slug: f.slug }))
}

function formatFlashDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })
}

export default async function FlashPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const flash = getFlash(slug)
  if (!flash || !flash.published) notFound()

  const catStyle          = CAT_STYLES[flash.category] ?? CAT_STYLES.macro
  const url               = `${BASE_URL}/flash/${flash.slug}`
  const { prev, next }    = getAdjacentFlash(slug)

  const schema = [
    {
      '@context':    'https://schema.org',
      '@type':       'NewsArticle',
      headline:      flash.title,
      datePublished: flash.date,
      dateModified:  flash.date,
      url,
      ...(flash.coverImage && {
        image: [{ '@type': 'ImageObject', url: flash.coverImage, width: 1200, height: 630 }],
      }),
      author:    [{ '@type': 'Organization', name: 'BhaavBrief', url: BASE_URL }],
      publisher: {
        '@type': 'Organization', name: 'BhaavBrief', url: BASE_URL,
        logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png`, width: 200, height: 60 },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',             item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Intelligence Feed', item: `${BASE_URL}/news` },
        { '@type': 'ListItem', position: 3, name: flash.title,         item: url },
      ],
    },
  ]

  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Masthead />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
        <nav style={{ marginBottom: '1.5rem' }}>
          <a href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', color: '#C8720A', textDecoration: 'none', borderBottom: '1px solid #C8720A', paddingBottom: 1 }}>
            ← Home
          </a>
        </nav>

        <article>
          <header style={{ paddingBottom: '1.25rem', marginBottom: '1.25rem', borderBottom: '0.5px solid #DDDDD0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', border: `0.5px solid ${catStyle.borderColor as string}`, background: catStyle.background as string, color: catStyle.color as string }}>
                {flash.category}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', background: '#F3F2EC', color: '#8A8A7A', border: '0.5px solid #C8C8B8' }}>
                Flash
              </span>
              <time dateTime={flash.date} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.05em' }}>
                {formatFlashDate(flash.date)}
              </time>
            </div>

            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: '0.6rem' }}>
              {flash.title}
            </h1>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>
              Source: {flash.source}
            </div>
          </header>

          {flash.coverImage && (
            <div style={{ marginBottom: '1.5rem', borderRadius: 6, overflow: 'hidden', aspectRatio: '16/7' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={flash.coverImage}
                alt={flash.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}

          <div className="brief-prose">
            <MDXRemote source={flash.content} />
          </div>
        </article>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#F3F2EC', border: '0.5px solid #DDDDD0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', color: '#48483A' }}>Found this useful? Share it with your trading circle.</span>
          <CopyLinkButton url={url} title={flash.title} />
        </div>

        <nav style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '0.5px solid #DDDDD0' }}>
          {(prev || next) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '1.25rem' }}>
              {next ? (
                <a href={`/flash/${next.slug}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', color: '#48483A', textDecoration: 'none', maxWidth: '45%', lineHeight: 1.4 }}>
                  <span style={{ display: 'block', color: '#8A8A7A', marginBottom: 3 }}>← Older</span>
                  {next.title.length > 72 ? next.title.slice(0, 72) + '…' : next.title}
                </a>
              ) : <span />}
              {prev ? (
                <a href={`/flash/${prev.slug}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', color: '#48483A', textDecoration: 'none', maxWidth: '45%', lineHeight: 1.4, textAlign: 'right' }}>
                  <span style={{ display: 'block', color: '#8A8A7A', marginBottom: 3 }}>Newer →</span>
                  {prev.title.length > 72 ? prev.title.slice(0, 72) + '…' : prev.title}
                </a>
              ) : <span />}
            </div>
          )}
          <a href="/news" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.05em', color: '#C8720A', textDecoration: 'none', borderBottom: '1px solid #C8720A', paddingBottom: 1 }}>← Intelligence Feed</a>
        </nav>
      </div>
    </div>
  )
}
