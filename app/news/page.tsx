import NewsFeed from '@/components/news/NewsFeed'

export const metadata = {
  title: 'MCX Intelligence Feed — Live Commodity News',
  description: 'Real-time MCX commodity market intelligence curated from top financial sources. Gold, Silver, Crude Oil, Copper and Natural Gas news — updated every 15 minutes during market hours.',
  alternates: { canonical: 'https://bhaavbrief.in/news' },
  openGraph: {
    title: 'MCX Intelligence Feed — Live Commodity News | BhaavBrief',
    description: 'Real-time MCX commodity market intelligence. Gold, Silver, Crude Oil, Copper and Natural Gas news updated every 15 minutes.',
    url: 'https://bhaavbrief.in/news',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'MCX Intelligence Feed | BhaavBrief', description: 'Real-time MCX commodity news — updated every 15 minutes.', site: '@bhaavbrief' },
}

export const revalidate = 300

export default function NewsPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>
          Intelligence Feed
        </h1>
        <span className="live-dot" style={{ fontSize: 12, color: 'var(--up)', fontWeight: 500 }}>Live</span>
      </div>
      <NewsFeed />
    </div>
  )
}
