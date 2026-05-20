import { NextResponse } from 'next/server'

export const revalidate = 900

const FEEDS = [
  { url: 'https://economictimes.indiatimes.com/markets/commodities/rssfeeds/1368177.cms', fallback: 'Economic Times' },
  { url: 'https://www.business-standard.com/rss/markets/commodities-3.rss',               fallback: 'Business Standard' },
  { url: 'https://news.google.com/rss/search?q=MCX+gold+silver+crude+commodity+India&hl=en-IN&gl=IN&ceid=IN:en', fallback: '' },
  { url: 'https://www.moneycontrol.com/rss/MCtopnews.xml',                                 fallback: 'Moneycontrol' },
]

const DOMAIN_SOURCE: [string, string][] = [
  ['economictimes.indiatimes.com', 'Economic Times'],
  ['business-standard.com',        'Business Standard'],
  ['moneycontrol.com',             'Moneycontrol'],
  ['reuters.com',                  'Reuters'],
  ['livemint.com',                 'Mint'],
  ['thehindu.com',                 'The Hindu'],
  ['ndtv.com',                     'NDTV'],
  ['financialexpress.com',         'Financial Express'],
  ['bloomberg.com',                'Bloomberg'],
]

function detectSource(link: string, fallback: string): string {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '')
    for (const [domain, name] of DOMAIN_SOURCE) {
      if (host.includes(domain)) return name
    }
    return fallback
  } catch {
    return fallback
  }
}

function detectCategory(text: string): { category: string; tagType: string } {
  const t = text.toLowerCase()
  if (/iran|russia|ukraine|hormuz|suez|sanction|geopolit|war\b/.test(t))   return { category: 'Geopolitics', tagType: 'energy' }
  if (/gold|silver|copper|metal|bullion|comex/.test(t))                     return { category: 'Metals',      tagType: 'metals' }
  if (/crude|oil\b|opec|brent|refinery|fuel|natural.gas|lng|lpg/.test(t))  return { category: 'Energy',      tagType: 'energy' }
  if (/agri|wheat|soybean|cotton|pepper|cardamom|castor|ncdex|monsoon|crop/.test(t)) return { category: 'Agri', tagType: 'agri' }
  return { category: 'Macro', tagType: 'macro' }
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
}

function stripCdata(s: string): string {
  return stripTags(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))
}

function stripSourceSuffix(title: string): string {
  return title.replace(/\s+[-–—|]\s+[^-–—|]{3,40}$/, '').trim()
}

export interface NewsItem {
  id:          string
  title:       string
  description: string
  link:        string
  pubDate:     string
  source:      string
  category:    string
  tagType:     string
}

async function fetchFeed(feedUrl: string, fallback: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BhaavBrief/2.0)' },
      next:    { revalidate: 900 },
      signal:  AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const text  = await res.text()
    const items: NewsItem[] = []

    for (const m of text.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const block = m[1]
      const titleM = block.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/) || block.match(/<title>([^<]{5,})<\/title>/)
      const linkM  = block.match(/<link>(https?:[^<]+)<\/link>/)
                  || block.match(/<guid[^>]*isPermaLink="true"[^>]*>(https?:[^<]+)<\/guid>/)
                  || block.match(/<guid[^>]*>(https?:[^<]+)<\/guid>/)
      const descM  = block.match(/<description><!\[CDATA\[([\s\S]+?)\]\]><\/description>/)
                  || block.match(/<description>([^<]{10,})<\/description>/)
      const dateM  = block.match(/<pubDate>([^<]+)<\/pubDate>/)

      if (!titleM || !linkM) continue

      const rawTitle = stripSourceSuffix(stripCdata(titleM[1].trim()))
      if (rawTitle.length < 10) continue

      const link    = linkM[1].trim()
      const source  = detectSource(link, fallback)
      const desc    = descM ? stripCdata(descM[1]).slice(0, 280) : ''
      const pubDate = dateM ? new Date(dateM[1].trim()).toISOString() : new Date().toISOString()
      const { category, tagType } = detectCategory(`${rawTitle} ${desc}`)

      items.push({ id: link, title: rawTitle, description: desc, link, pubDate, source, category, tagType })
    }

    return items
  } catch {
    return []
  }
}

function titleWords(title: string): Set<string> {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)
  )
}

function areSimilar(a: string, b: string): boolean {
  const wa = titleWords(a)
  const wb = titleWords(b)
  if (wa.size === 0 || wb.size === 0) return false
  let shared = 0
  for (const w of wa) if (wb.has(w)) shared++
  return shared / Math.min(wa.size, wb.size) > 0.6
}

function deduplicate(items: NewsItem[]): NewsItem[] {
  const out: NewsItem[] = []
  for (const item of items) {
    if (!out.some(r => areSimilar(r.title, item.title))) out.push(item)
  }
  return out
}

export async function GET() {
  const batches = await Promise.all(FEEDS.map(f => fetchFeed(f.url, f.fallback)))
  const all     = batches.flat()
  const deduped = deduplicate(all)
  deduped.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  return NextResponse.json(deduped.slice(0, 40), {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
  })
}
