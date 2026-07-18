import fs   from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { deriveCommodityLabelsFromTags } from './commodityTags'

export interface ContentEntry {
  type:        'brief' | 'article' | 'hawk-scan' | 'news' | 'commodity'
  slug:        string
  href:        string
  title:       string
  description: string
  excerpt:     string
  date:        string
  edition:     string | number
  tags:        string[]
  commodities: string[]
  commodity:   string
  priceAtPublish?: number
}

export interface ScoredEntry extends ContentEntry {
  score: number
}

const BRIEFS_DIR   = path.join(process.cwd(), 'content/briefs')
const ARTICLES_DIR = path.join(process.cwd(), 'content/articles')
const NEWS_FILE    = path.join(process.cwd(), 'data/ai-news.json')

// 60-second TTL cache — re-reads filesystem after each minute
// so new briefs/articles appear within 60s of being deployed
let _cache: ContentEntry[]  | null = null
let _cacheAt: number = 0
const TTL_MS = 60_000

function extractExcerpt(content: string, maxLen = 200): string {
  return content
    .replace(/^#+\s+.+$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

function makeBriefEntry(file: string): ContentEntry | null {
  try {
    const raw  = fs.readFileSync(path.join(BRIEFS_DIR, file), 'utf8')
      .replace(/^```(?:mdx|md)?\n/, '').replace(/\n```\s*$/, '\n')
    const { data, content } = matter(raw)
    if (!data.title) return null
    const slug = file.replace(/\.(mdx|md)$/, '')
    return {
      type:        'brief',
      slug,
      href:        `/briefs/${slug}`,
      title:       String(data.title ?? ''),
      description: String(data.description ?? data.summary ?? ''),
      excerpt:     extractExcerpt(content),
      date:        String(data.date ?? ''),
      edition:     data.edition ?? '',
      tags:        Array.isArray(data.tags)        ? data.tags        : (data.tags ? [String(data.tags)] : []),
      commodities: Array.isArray(data.commodities) && data.commodities.length > 0
        ? data.commodities
        : deriveCommodityLabelsFromTags(Array.isArray(data.tags) ? data.tags : []),
      commodity:   String(data.commodity ?? ''),
    }
  } catch { return null }
}

function makeArticleEntry(file: string): ContentEntry | null {
  try {
    const raw  = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8')
      .replace(/^```(?:mdx|md)?\n/, '').replace(/\n```\s*$/, '\n')
    const { data, content } = matter(raw)
    if (!data.title) return null
    const slug = file.replace(/\.(mdx|md)$/, '')
    return {
      type:        data.edition === 'hawk-scan' ? 'hawk-scan' : 'article',
      slug,
      href:        `/articles/${slug}`,
      title:       String(data.title ?? ''),
      description: String(data.description ?? ''),
      excerpt:     extractExcerpt(content),
      date:        String(data.date ?? ''),
      edition:     String(data.edition ?? 'flash'),
      tags:        Array.isArray(data.tags) ? data.tags : (data.tags ? [String(data.tags)] : []),
      commodity:   String(data.commodity ?? ''),
      commodities: data.commodity ? [String(data.commodity)] : [],
      priceAtPublish: parseFloat(String(data.priceAtPublish ?? '0')) || 0,
    }
  } catch { return null }
}

function readBriefs(): ContentEntry[] {
  if (!fs.existsSync(BRIEFS_DIR)) return []
  return fs.readdirSync(BRIEFS_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(makeBriefEntry)
    .filter((e): e is ContentEntry => e !== null)
}

function readArticles(): ContentEntry[] {
  if (!fs.existsSync(ARTICLES_DIR)) return []
  return fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(makeArticleEntry)
    .filter((e): e is ContentEntry => e !== null)
}

function readNews(): ContentEntry[] {
  try {
    const items = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8')) as Array<{
      id: string; title: string; summary: string; category: string; pubDate: string;
    }>
    const cutoff = Date.now() - 72 * 3600 * 1000
    return items
      .filter(n => new Date(n.pubDate).getTime() > cutoff)
      .map(n => ({
        type:        'news' as const,
        slug:        n.id,
        href:        '/news',
        title:       n.title,
        description: n.summary,
        excerpt:     n.summary,
        date:        n.pubDate,
        edition:     '',
        tags:        [n.category],
        commodities: [],
        commodity:   n.category,
      }))
  } catch { return [] }
}

// Static reference pages (app/commodities/[commodity]) — live price + explainers.
// Not filesystem content like briefs/articles, so they're listed here rather than
// derived, and given "now" as their date so they always earn the recency boost —
// they're the one destination that's always current.
const COMMODITY_PAGES: Array<{ slug: string; name: string; description: string }> = [
  { slug: 'gold',       name: 'Gold',       description: 'MCX gold price live today — why gold is up or down: Fed policy, rupee-dollar moves, COMEX spread and geopolitics. OHLC, import parity and daily intelligence for Indian traders.' },
  { slug: 'silver',     name: 'Silver',     description: 'MCX silver price live today — why silver is up or down: gold-silver ratio, industrial demand, COMEX moves and rupee impact. OHLC and daily intelligence for Indian traders.' },
  { slug: 'crude-oil',  name: 'Crude Oil',  description: 'MCX crude oil price live today — why crude is up or down: OPEC decisions, WTI/Brent spread, Iran risk, rupee impact. OHLC, import parity and daily intelligence for Indian traders.' },
  { slug: 'copper',     name: 'Copper',     description: 'MCX copper price live today — why copper is up or down: China PMI, LME inventory, COMEX moves and rupee impact. OHLC, import parity and daily intelligence for Indian traders.' },
  { slug: 'natural-gas', name: 'Natural Gas', description: 'MCX natural gas price live today — why nat gas is up or down: Henry Hub correlation, winter demand, LNG exports and rupee impact. OHLC and daily intelligence for Indian traders.' },
  { slug: 'zinc',       name: 'Zinc',       description: 'MCX zinc price live today — why zinc is up or down: LME stocks, Hindustan Zinc output, China galvanizing demand and rupee impact. OHLC and daily intelligence for Indian traders.' },
  { slug: 'aluminium',  name: 'Aluminium',  description: 'MCX aluminium price live today — why aluminium is up or down: China smelter output, LME stocks, EU energy costs and rupee impact. OHLC and daily intelligence for Indian traders.' },
  { slug: 'lead',       name: 'Lead',       description: 'MCX lead price live today — why lead is up or down: battery demand, inverter cycle, Hindustan Zinc output and rupee impact. OHLC and daily intelligence for Indian traders.' },
  { slug: 'nickel',     name: 'Nickel',     description: 'MCX nickel price live today — why nickel is up or down: Indonesia export ban, LME stocks, EV battery demand and rupee impact. OHLC and daily intelligence for Indian traders.' },
]

function readCommodityPages(): ContentEntry[] {
  const now = new Date().toISOString()
  return COMMODITY_PAGES.map(c => ({
    type:        'commodity' as const,
    slug:        `commodity-${c.slug}`,
    href:        `/commodities/${c.slug}`,
    title:       `MCX ${c.name} — Live Price & Intelligence`,
    description: c.description,
    excerpt:     c.description,
    date:        now,
    edition:     '',
    tags:        [c.name.toLowerCase(), ...c.slug.split('-')],
    commodities: [c.name],
    commodity:   c.name,
  }))
}

export function loadIndex(): ContentEntry[] {
  const now = Date.now()
  if (_cache && (now - _cacheAt) < TTL_MS) return _cache

  const briefs      = readBriefs()
  const articles    = readArticles()
  const news        = readNews()
  const commodities = readCommodityPages()

  _cache = [...briefs, ...articles, ...news, ...commodities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  _cacheAt = now
  return _cache
}

// Score content against a query using keyword overlap + recency
export function scoreEntries(query: string, limit = 5): ScoredEntry[] {
  const index = loadIndex()
  const words = query.toLowerCase().split(/\W+/).filter(w => w.length > 2)
  if (words.length === 0) return []

  const STOP = new Set(['the', 'and', 'for', 'are', 'was', 'how', 'does', 'what', 'when', 'will', 'can', 'did'])

  const scored = index.map(entry => {
    const titleL   = entry.title.toLowerCase()
    const descL    = entry.description.toLowerCase()
    const excerptL = entry.excerpt.toLowerCase()
    const tagsL    = entry.tags.join(' ').toLowerCase()
    const commL    = (entry.commodities.join(' ') + ' ' + entry.commodity).toLowerCase()

    let score = 0
    for (const word of words) {
      if (STOP.has(word)) continue
      if (titleL.includes(word))   score += 4
      if (tagsL.includes(word))    score += 3
      if (commL.includes(word))    score += 3
      if (descL.includes(word))    score += 2
      if (excerptL.includes(word)) score += 1
    }

    // Recency boost — only as a tiebreaker among entries that already matched a
    // keyword, never on its own. Unconditional, this let every commodity page
    // (always dated "now") outrank genuinely relevant content on unrelated queries.
    if (score > 0) {
      const ageDays = (Date.now() - new Date(entry.date).getTime()) / 86400000
      if (ageDays <= 1)  score += 3
      if (ageDays <= 7)  score += 2
      if (ageDays <= 30) score += 1
    }

    // Hawk-scan surfaces first when relevant
    if (entry.type === 'hawk-scan' && score > 0) score += 2

    // The commodity reference page (live price + explainers) is the best single
    // destination for a bare commodity-name query — rank it above one-off mentions.
    if (entry.type === 'commodity' && score > 0) score += 5

    return { ...entry, score }
  })

  return scored
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// Build compact context block for Claude prompt
export function buildContentContext(entries: ScoredEntry[]): string {
  if (entries.length === 0) return 'No relevant past content found.'
  return entries.map((e, i) =>
    `[${i + 1}] ${e.type.toUpperCase()} | ${e.date.slice(0, 10)} | ${e.title}\n    ${e.description.slice(0, 150)}`
  ).join('\n\n')
}
