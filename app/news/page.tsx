import NewsFeed, { type NewsItem } from '@/components/news/NewsFeed'
import { getAllFlash }    from '@/lib/flash'
import { getAllArticles } from '@/lib/articles'

export const metadata = {
  title: 'MCX Commodity Intelligence Feed — Why Prices Are Moving Today',
  description: 'Real-time MCX commodity intelligence — explains why gold, crude oil, silver and copper are moving. OPEC decisions, Fed policy, rupee-dollar shifts, geopolitical events — connected to your MCX position. Updated every 15 minutes.',
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
  alternates: { canonical: 'https://bhaavbrief.in/news' },
  openGraph: {
    title: 'MCX Commodity Intelligence — Why Prices Are Moving | BhaavBrief',
    description: 'Real-time MCX intelligence: why gold, crude, silver are moving — OPEC, Fed, rupee-dollar, geopolitics. Updated every 15 minutes.',
    url: 'https://bhaavbrief.in/news',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'MCX Intelligence Feed | BhaavBrief', description: 'Why MCX gold, crude oil and silver are moving today — AI-powered commodity intelligence updated every 15 minutes.', site: '@bhaavbrief' },
}

export const dynamic = 'force-dynamic'

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

export default async function NewsPage() {
  const [flashItems, articles] = await Promise.all([
    Promise.resolve(getAllFlash()),
    getAllArticles(),
  ])

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const serverItems: NewsItem[] = [
    ...flashItems
      .filter(f => f.date >= sevenDaysAgo)
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
  ]

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '0.5px solid #DDDDD0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#C8720A',
            background: '#FFF7E0',
            border: '0.5px solid #D4A830',
            padding: '3px 9px',
          }}>
            Live · Updated every 15 min
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
          Intelligence Feed
        </h1>

        <p style={{
          fontSize: 15,
          color: '#48483A',
          lineHeight: 1.7,
          margin: 0,
          fontWeight: 300,
          maxWidth: 560,
        }}>
          Cross-asset commodity intelligence for India's traders, investors and businesses.
        </p>
      </div>

      <NewsFeed serverItems={serverItems} />
    </div>
  )
}
