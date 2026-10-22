import type { Metadata } from 'next'
import Link from 'next/link'
import NewsFeed from '@/components/news/NewsFeed'
import { getAllFlash }    from '@/lib/flash'
import { getAllArticles } from '@/lib/articles'
import { getAllResearch } from '@/lib/research'
import {
  FILTERS,
  ITEMS_PER_PAGE,
  matchesFilter,
  dedupeAndSort,
  parseCategoryParam,
  parsePageParam,
  newsHref,
  type NewsItem,
} from '@/lib/newsFilter'
import SectionTabs from '@/components/SectionTabs'
import Pill from '@/components/ui/Pill'
import { safeJsonLd } from '@/lib/seo'

export const revalidate = 60

type SearchParams = Promise<{ category?: string; page?: string }>

const BASE_URL = 'https://bhaavbrief.in'

function buildTitle(category: string, page: number): string {
  if (category === 'All') {
    return page > 1
      ? `MCX Commodity Intelligence Feed — Page ${page}`
      : 'MCX Commodity Intelligence Feed — Why Prices Are Moving Today'
  }
  return page > 1
    ? `${category} — MCX Commodity Intelligence Feed — Page ${page}`
    : `${category} — MCX Commodity Intelligence Feed`
}

const BASE_DESCRIPTION = 'Real-time MCX commodity intelligence — explains why gold, crude oil, silver and copper are moving. OPEC decisions, Fed policy, rupee-dollar shifts, geopolitical events — connected to your MCX position. Updated every 15 minutes.'

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { category: rawCategory, page: rawPage } = await searchParams
  const category = parseCategoryParam(rawCategory)
  // totalPages isn't known without reading content — reuse the same data
  // reads as the page body would be wasteful here, so clamp loosely; an
  // out-of-range page number still renders page 1's worth of metadata,
  // which only affects the <title>/canonical of a URL nobody links to.
  const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1)

  const title = buildTitle(category, page)
  const ogTitle = `${title} | BhaavBrief`
  const canonical = `${BASE_URL}${newsHref(category, page)}`

  return {
    title,
    description: BASE_DESCRIPTION,
    keywords: [
      'why is MCX gold moving today',
      'why crude oil price falling India',
      'OPEC decision MCX crude oil impact',
      'US Fed rate MCX gold India',
      'rupee fall impact commodity prices',
      'MCX commodity market news today',
      'geopolitics MCX commodity India',
      'commodity market intelligence India today',
      'MCX silver why moving',
      'Iran tensions crude oil MCX',
    ],
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description: BASE_DESCRIPTION,
      url: canonical,
      siteName: 'BhaavBrief',
      type: 'website' as const,
      locale: 'en_IN',
    },
    twitter: { card: 'summary' as const, title: ogTitle, description: BASE_DESCRIPTION, site: '@bhaavbrief' },
  }
}

function commodityTagType(commodity: string): string {
  const c = commodity.toLowerCase()
  if (c.includes('gold') || c.includes('silver') || c.includes('copper')) return 'metals'
  if (c.includes('crude') || c.includes('natural gas') || c.includes('gas')) return 'energy'
  return 'macro'
}

function commodityCategory(commodity: string): string {
  if (commodity === 'multi') return 'MCX Brief'
  return commodity.replace(/^MCX\s+/i, '')
}

export default async function NewsPage({ searchParams }: { searchParams: SearchParams }) {
  // D-01 (17-Jul audit): this route was found serving a frozen ~7-week-old
  // render in production, with source/content confirmed healthy — pointing at
  // a silent ISR revalidation failure rather than a code bug. If getAllFlash()
  // or getAllArticles() ever throws during a future revalidation, log it loudly
  // instead of letting Vercel silently keep serving the last good render
  // indefinitely, which is what made the original incident take 51 days to
  // notice.
  let flashItems: ReturnType<typeof getAllFlash>
  let articles: Awaited<ReturnType<typeof getAllArticles>>
  let research: ReturnType<typeof getAllResearch>
  try {
    ;[flashItems, articles, research] = await Promise.all([
      Promise.resolve(getAllFlash()),
      getAllArticles(),
      Promise.resolve(getAllResearch()),
    ])
  } catch (e) {
    console.error('[news/page] getAllFlash/getAllArticles/getAllResearch threw during render — D-01 class failure:', e)
    throw e
  }

  const { category: rawCategory, page: rawPage } = await searchParams
  const category = parseCategoryParam(rawCategory)

  const generatedAtIST = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 16).replace('T', ' ') + ' IST'

  const rawItems: NewsItem[] = [
    ...flashItems
      .map(f => ({
        id:       f.slug,
        title:    f.title,
        summary:  f.excerpt,
        category: f.category,
        tagType:  f.category === 'forex' ? 'macro' : f.category,
        pubDate:  f.date,
        href:       `/flash/${f.slug}`,
        itemType:   'flash' as const,
        coverImage: f.coverImage,
      })),
    ...articles
      .filter(a => a.title !== 'Market Update' && a.date)
      .map(a => ({
        id:       a.slug,
        title:    a.title,
        summary:  a.description,
        category: commodityCategory(a.commodity),
        tagType:  commodityTagType(a.commodity),
        pubDate:  a.date,
        href:     `/articles/${a.slug}`,
        itemType: (a.edition === 'hawk-scan' ? 'hawk-scan' : 'alert') as 'hawk-scan' | 'alert',
      })),
    ...research
      .filter(r => r.published)
      .map(r => ({
        id:       r.slug,
        title:    r.title,
        summary:  r.description,
        category: commodityCategory(r.commodity),
        tagType:  commodityTagType(r.commodity),
        pubDate:  r.date,
        href:     `/research/${r.slug}`,
        itemType: 'research' as const,
        premium:  r.premium,
      })),
  ]

  const allItems = dedupeAndSort(rawItems)

  const counts: Record<string, number> = {}
  for (const f of FILTERS) {
    counts[f] = f === 'All' ? allItems.length : allItems.filter(item => matchesFilter(item, f)).length
  }

  const filtered = category === 'All' ? allItems : allItems.filter(item => matchesFilter(item, category))
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const page = parsePageParam(rawPage, totalPages)
  const start = (page - 1) * ITEMS_PER_PAGE
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE)

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type':     'CollectionPage',
        '@id':       `${BASE_URL}${newsHref(category, page)}`,
        name:        'MCX Commodity Intelligence Feed',
        description: BASE_DESCRIPTION,
        url:         `${BASE_URL}${newsHref(category, page)}`,
      },
      {
        '@type': 'ItemList',
        itemListElement: pageItems.map((item, i) => ({
          '@type':  'ListItem',
          position: start + i + 1,
          url:      item.href ? `${BASE_URL}${item.href}` : undefined,
          name:     item.title,
        })),
      },
    ],
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <SectionTabs
        active="/news"
        tabs={[
          { label: 'Daily Editions', href: '/briefs' },
          { label: 'Feed',           href: '/news' },
        ]}
      />
      {/* Page header */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '0.5px solid #DDDDD0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <Pill tone="live" size="sm">Live · Updated every 15 min</Pill>
          <span
            title="When this page was last rendered — a stuck value here means the page stopped refreshing"
            style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--ink-4)' }}
          >
            Rendered {generatedAtIST}
          </span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          color: '#18180F',
          margin: '0 0 12px',
          lineHeight: 1.1,
        }}>
          Market Intelligence
        </h1>

        <p style={{
          fontSize: 15,
          color: '#48483A',
          lineHeight: 1.7,
          margin: 0,
          fontWeight: 300,
          maxWidth: 560,
        }}>
          What&apos;s moving MCX today — gold, crude, silver, copper. Updated every 15 minutes.
        </p>

        <Link href="/research" style={{ display: 'inline-block', fontSize: 13, color: 'var(--gold-dark)', fontWeight: 600, textDecoration: 'none', marginTop: 12 }}>
          Browse all Pro Research →
        </Link>
      </div>

      <NewsFeed
        items={pageItems}
        counts={counts}
        activeFilter={category}
        page={page}
        totalPages={totalPages}
        totalFiltered={filtered.length}
      />
    </div>
  )
}
