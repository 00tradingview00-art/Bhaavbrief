import NewsFeed from '@/components/news/NewsFeed'

export const metadata = {
  title: 'Intelligence Feed — AI Commodity Market Intelligence | BhaavBrief',
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
            fontFamily: 'IBM Plex Mono, monospace',
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
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#8A8A7A', letterSpacing: '0.08em' }}>
            AI-Generated
          </span>
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
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
          margin: '0 0 16px',
          fontWeight: 300,
          maxWidth: 620,
        }}>
          Cross-asset commodity intelligence for Indian traders and businesses. Every brief connects a market signal to its MCX impact, rupee-dollar dynamics, government policy, and global macro context — eliminating noise, delivering signal.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {['Commodities', 'Geopolitics', 'Govt Policy', 'Macro & Inflation', 'Rupee Impact'].map(tag => (
            <span key={tag} style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: '#8A8A7A',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#C8C8B8', display: 'inline-block' }} />
              {tag}
            </span>
          ))}
        </div>
      </div>

      <NewsFeed />
    </div>
  )
}
