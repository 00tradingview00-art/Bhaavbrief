import NewsFeed from '@/components/news/NewsFeed'

export const metadata = {
  title: 'Intelligence Feed — BhaavBrief',
  description: 'Live commodity news curated from MCX, Reuters, Bloomberg, ET Markets. Updated every 15 minutes.',
}

export const revalidate = 900

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
