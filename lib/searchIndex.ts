import fs   from 'fs'
import path from 'path'

export interface ContentEntry {
  type:        'brief' | 'article' | 'hawk-scan'
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

const INDEX_PATH = path.join(process.cwd(), 'data/content-index.json')

let _cache: ContentEntry[] | null = null

export function loadIndex(): ContentEntry[] {
  if (_cache) return _cache
  try {
    _cache = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'))
    return _cache!
  } catch {
    return []
  }
}

// Score a content entry against a query using keyword overlap + recency
export function scoreEntries(query: string, limit = 5): ScoredEntry[] {
  const index = loadIndex()
  const words = query.toLowerCase().split(/\W+/).filter(w => w.length > 2)
  if (words.length === 0) return []

  const STOP = new Set(['the', 'and', 'for', 'are', 'was', 'how', 'does', 'what', 'when', 'will', 'can', 'did'])

  const scored = index.map(entry => {
    const titleL = entry.title.toLowerCase()
    const descL  = entry.description.toLowerCase()
    const excerptL = entry.excerpt.toLowerCase()
    const tagsL  = entry.tags.join(' ').toLowerCase()
    const commL  = (entry.commodities.join(' ') + ' ' + entry.commodity).toLowerCase()

    let score = 0
    for (const word of words) {
      if (STOP.has(word)) continue
      if (titleL.includes(word))   score += 4
      if (tagsL.includes(word))    score += 3
      if (commL.includes(word))    score += 3
      if (descL.includes(word))    score += 2
      if (excerptL.includes(word)) score += 1
    }

    // Recency boost — last 7 days get +2
    const ageDays = (Date.now() - new Date(entry.date).getTime()) / 86400000
    if (ageDays <= 7)  score += 2
    if (ageDays <= 30) score += 1

    // Hawk-scan boost — high urgency content surfaces first when relevant
    if (entry.type === 'hawk-scan' && score > 0) score += 2

    return { ...entry, score }
  })

  return scored
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// Build a compact context block from top results for the Claude prompt
export function buildContentContext(entries: ScoredEntry[]): string {
  if (entries.length === 0) return 'No relevant past content found.'
  return entries.map((e, i) =>
    `[${i + 1}] ${e.type.toUpperCase()} | ${e.date} | ${e.title}\n    ${e.description}`
  ).join('\n\n')
}
