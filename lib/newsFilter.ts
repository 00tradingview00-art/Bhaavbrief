// Shared by app/news/page.tsx (server-side slicing) and
// components/news/NewsFeed.tsx (rendering) so pagination/category filtering
// can happen server-side — real URLs per page/category instead of client
// useState — while keeping identical behavior to the pre-refactor version.

export const FILTERS = ['All', 'Metals', 'Energy', 'Policy', 'Macro', 'Agri', 'Geopolitics']

const FILTER_KEYWORDS: Record<string, string[]> = {
  Metals:      ['gold', 'silver', 'copper', 'metal', 'aluminium', 'zinc', 'nickel', 'platinum'],
  Energy:      ['crude', 'oil', 'opec', 'brent', 'natural gas', 'lng', 'lpg', 'refinery'],
  Policy:      ['import duty', 'export', 'customs', 'tariff', 'excise', 'sebi', 'rbi', 'repo', 'msp', 'budget', 'finance ministry', 'monetary policy', 'regulation'],
  Macro:       ['macro', 'inflation', 'cpi', 'wpi', 'gdp', 'pmi', 'iip', 'rupee', 'forex', 'usdinr', 'federal reserve', 'rate cut', 'rate hike', 'trade deficit'],
  Agri:        ['agri', 'wheat', 'soybean', 'cotton', 'ncdex', 'monsoon', 'crop', 'cardamom', 'pepper', 'kharif', 'rabi', 'castor'],
  Geopolitics: ['iran', 'russia', 'ukraine', 'sanction', 'hormuz', 'suez', 'red sea', 'war', 'geopolit'],
}

export const ITEMS_PER_PAGE = 20

export interface NewsItem {
  id:          string
  title:       string
  summary:     string
  category:    string
  tagType:     string
  pubDate:     string
  pubDateIST?: string
  href?:       string
  itemType?:   'news' | 'flash' | 'alert' | 'hawk-scan' | 'research'
  coverImage?: string
  premium?:    boolean
}

export function toISTDateKey(iso: string): string {
  return new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)
}

export function matchesFilter(item: NewsItem, filter: string): boolean {
  if (filter === 'All') return true
  const filterKey = filter.toLowerCase()

  // Primary: use pre-computed tagType for the core commodity buckets
  if (['metals', 'energy', 'macro'].includes(filterKey)) {
    return item.tagType === filterKey
  }

  // Secondary filters (Policy, Agri, Geopolitics): keyword search on title only
  // — never include summary to avoid cross-mentions causing false matches
  const text = `${item.title} ${item.category}`.toLowerCase()
  return (FILTER_KEYWORDS[filter] ?? [filterKey]).some(k => text.includes(k))
}

// Dedup by id and href, then sort newest-first by IST calendar day, with
// hawk-scan items floated to the top within the same day.
export function dedupeAndSort(items: NewsItem[]): NewsItem[] {
  const seenIds   = new Set<string>()
  const seenHrefs = new Set<string>()
  return items
    .filter(item => {
      if (seenIds.has(item.id)) return false
      if (item.href && seenHrefs.has(item.href)) return false
      seenIds.add(item.id)
      if (item.href) seenHrefs.add(item.href)
      return true
    })
    .sort((a, b) => {
      const aDate = toISTDateKey(a.pubDate)
      const bDate = toISTDateKey(b.pubDate)
      if (bDate !== aDate) return bDate.localeCompare(aDate)
      const aHawk = a.itemType === 'hawk-scan' ? 1 : 0
      const bHawk = b.itemType === 'hawk-scan' ? 1 : 0
      if (bHawk !== aHawk) return bHawk - aHawk
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    })
}

export function parseCategoryParam(raw: string | undefined): string {
  if (!raw) return 'All'
  const match = FILTERS.find(f => f.toLowerCase() === raw.toLowerCase())
  return match ?? 'All'
}

export function parsePageParam(raw: string | undefined, totalPages: number): number {
  const n = Number.parseInt(raw ?? '1', 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, totalPages)
}

export function categorySlug(filter: string): string {
  return filter.toLowerCase()
}

// Builds a /news href carrying whichever of category/page differ from the
// defaults (All, page 1) — used for filter pills, pagination links and canonicals.
export function newsHref(category: string, page: number): string {
  const params = new URLSearchParams()
  if (category !== 'All') params.set('category', categorySlug(category))
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return `/news${qs ? `?${qs}` : ''}`
}
