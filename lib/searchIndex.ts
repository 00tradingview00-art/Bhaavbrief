import fs   from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface ContentEntry {
  type:        'brief' | 'article' | 'hawk-scan' | 'news'
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
      commodities: Array.isArray(data.commodities) ? data.commodities : (data.commodities ? [String(data.commodities)] : []),
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

export function loadIndex(): ContentEntry[] {
  const now = Date.now()
  if (_cache && (now - _cacheAt) < TTL_MS) return _cache

  const briefs   = readBriefs()
  const articles = readArticles()
  const news     = readNews()

  _cache = [...briefs, ...articles, ...news]
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

    // Recency boost
    const ageDays = (Date.now() - new Date(entry.date).getTime()) / 86400000
    if (ageDays <= 1)  score += 3
    if (ageDays <= 7)  score += 2
    if (ageDays <= 30) score += 1

    // Hawk-scan surfaces first when relevant
    if (entry.type === 'hawk-scan' && score > 0) score += 2

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
