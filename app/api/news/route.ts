import { NextResponse } from 'next/server'

export const revalidate = 900

const RSS_SOURCES = [
  { url: 'https://economictimes.indiatimes.com/markets/commodities/rssfeeds/1368177.cms', name: 'Economic Times' },
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',           name: 'Economic Times' },
  { url: 'https://www.livemint.com/rss/markets',                                           name: 'Mint' },
  { url: 'https://feeds.feedburner.com/ndtvprofit-latest',                                 name: 'NDTV Profit' },
]

const COMMODITY_KEYWORDS = /gold|silver|crude|copper|\bgas\b|mcx|commodity|bullion|metal|oil\b|ncdex|rupee|dollar/i

function detectCategory(text: string): { category: string; tagType: string } {
  const t = text.toLowerCase()
  if (/iran|russia|ukraine|hormuz|suez|sanction|geopolit|war\b/.test(t))            return { category: 'Geopolitics', tagType: 'energy' }
  if (/gold|silver|copper|metal|bullion|comex/.test(t))                              return { category: 'Metals',      tagType: 'metals' }
  if (/crude|oil\b|opec|brent|refinery|fuel|natural.gas|lng|lpg/.test(t))           return { category: 'Energy',      tagType: 'energy' }
  if (/agri|wheat|soybean|cotton|pepper|cardamom|castor|ncdex|monsoon|crop/.test(t)) return { category: 'Agri',       tagType: 'agri' }
  return { category: 'Macro', tagType: 'macro' }
}

function stripHtml(s: string): string {
  return (s ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/\s+/g,    ' ')
    .trim()
}

function cleanDescription(raw: string): string {
  if (!raw) return ''
  const cdata   = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ?? raw
  const noTags  = cdata.replace(/<[^>]+>/g, ' ')
  const decoded = noTags
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ')
  const clean = decoded.replace(/\s+/g, ' ').trim()
  if (!clean || clean.startsWith('http') || clean.startsWith('<')) return ''
  return clean
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

async function fetchFeed(url: string, name: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BhaavBrief/2.0)' },
      next:    { revalidate: 900 },
      signal:  AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const text  = await res.text()
    const items: NewsItem[] = []

    for (const m of text.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const block  = m[1]
      const titleM = block.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/) || block.match(/<title>([^<]{5,})<\/title>/)
      const linkM  = block.match(/<link>(https?:[^<]+)<\/link>/)
                  || block.match(/<guid[^>]*isPermaLink="true"[^>]*>(https?:[^<]+)<\/guid>/)
                  || block.match(/<guid[^>]*>(https?:[^<]+)<\/guid>/)
      const descRaw = block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? ''
      const dateM   = block.match(/<pubDate>([^<]+)<\/pubDate>/)

      if (!titleM || !linkM) continue

      const rawTitle = stripSourceSuffix(stripHtml(titleM[1].trim()))
      if (rawTitle.length < 10) continue
      if (!COMMODITY_KEYWORDS.test(rawTitle)) continue

      const link    = linkM[1].trim()
      const desc    = cleanDescription(descRaw).slice(0, 280)
      const pubDate = dateM ? new Date(dateM[1].trim()).toISOString() : new Date().toISOString()
      const { category, tagType } = detectCategory(`${rawTitle} ${desc}`)

      items.push({ id: link, title: rawTitle, description: desc, link, pubDate, source: name, category, tagType })
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

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function sortAndSlice(items: NewsItem[]): NewsItem[] {
  return items
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 40)
}

export async function GET() {
  const batches = await Promise.all(RSS_SOURCES.map(s => fetchFeed(s.url, s.name)))
  const all     = batches.flat()

  const cutoff   = Date.now() - THIRTY_DAYS_MS
  const filtered = all.filter(item => new Date(item.pubDate).getTime() >= cutoff)

  // If the date filter leaves fewer than 5 results, return unfiltered
  const source  = filtered.length >= 5 ? filtered : all
  const deduped = deduplicate(source)

  return NextResponse.json(sortAndSlice(deduped), {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
  })
}
