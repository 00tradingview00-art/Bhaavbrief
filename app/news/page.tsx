import NewsFeed from '@/components/news/NewsFeed'

export const metadata = {
  title: 'Intelligence Feed — AI Commodity Market Intelligence',
  description: 'BhaavBrief Intelligence: AI-powered cross-asset commodity briefings connecting commodities, geopolitics, government policy, currencies, and macro events — updated every 15 minutes.',
  alternates: { canonical: 'https://bhaavbrief.in/news' },
  openGraph: {
    title: 'Intelligence Feed | BhaavBrief — India\'s AI Commodity Intelligence Platform',
    description: 'Cross-asset commodity intelligence: MCX markets, government policy, rupee impact, and global macro — AI-generated and updated every 15 minutes.',
    url: 'https://bhaavbrief.in/news',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'Intelligence Feed | BhaavBrief', description: 'AI-powered cross-asset commodity intelligence for Indian traders.', site: '@bhaavbrief' },
}

export const revalidate = 300

export default function NewsPage() {
  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '0.5px solid #DDDDD0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
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
          fontSize: 13,
          color: '#48483A',
          lineHeight: 1.7,
          margin: 0,
          fontWeight: 300,
          maxWidth: 560,
        }}>
          Cross-asset commodity intelligence for Indian traders and businesses.
        </p>
      </div>

      <NewsFeed />
    </div>
  )
}
