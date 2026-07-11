import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { deriveCommodityLabelsFromTags } from './commodityTags'

const BRIEFS_DIR = path.join(process.cwd(), 'content/briefs')

function cleanSummary(raw: string): string {
  if (!raw) return ''
  const stripped = raw.replace(/^\*|\*$/g, '').trim()
  if (/^(edition\s+\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\s+\w+\s+\d{4})/i.test(stripped)) return ''
  return raw
}

function computeUrlSlug(date: string, title: string, frontmatterSlug?: string, fileSlug?: string): string {
  // Prefer explicit urlSlug in frontmatter
  if (frontmatterSlug) return frontmatterSlug
  // Derive from date + title
  if (date && title) {
    const raw = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    const titlePart = raw.length > 75 ? raw.slice(0, 76).replace(/-[^-]*$/, '') : raw
    return `${date}-${titlePart}`
  }
  // Fallback to filename slug
  return fileSlug ?? ''
}

export interface BriefMeta {
  slug:        string   // filename slug (e.g. edition-035) — used for file lookup
  urlSlug:     string   // SEO-friendly URL slug (e.g. 2026-06-04-mcx-open-gold-risk-off)
  title:       string
  date:        string
  displayDate: string
  description: string
  summary:     string
  edition:     number
  tags:        string[]
  commodities: string[]
  published:   boolean
}

export interface Brief extends BriefMeta {
  content: string
}

function parseBriefFile(filename: string): BriefMeta | null {
  const fileSlug = filename.replace(/\.(mdx|md)$/, '')
  const raw      = fs.readFileSync(path.join(BRIEFS_DIR, filename), 'utf8')
  const { data } = matter(raw)

  const isoDate = data.date || ''
  const rawDesc = cleanSummary(data.summary) || data.metaDescription || data.description || data.excerpt || ''
  const desc    = rawDesc && !/[.!?]$/.test(rawDesc.trim()) ? `${rawDesc}…` : rawDesc

  return {
    slug:    fileSlug,
    urlSlug: computeUrlSlug(isoDate, data.title, data.urlSlug, fileSlug),
    title:       data.title    || 'Untitled',
    date:        isoDate,
    displayDate: isoDate
      ? new Date(isoDate).toLocaleDateString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          timeZone: 'Asia/Kolkata',
        })
      : '',
    description: desc,
    summary:     desc,
    edition:     data.edition  ?? 0,
    tags:        data.tags     || [],
    commodities: Array.isArray(data.commodities) && data.commodities.length > 0
      ? data.commodities
      : deriveCommodityLabelsFromTags(data.tags),
    published:   data.published !== false,
  }
}

// 60-second TTL cache — mirrors lib/searchIndex.ts's pattern. getAllBriefs()
// is called from over a dozen routes; without this, every one of them
// re-reads and re-parses every content/briefs/*.mdx file from scratch (the
// corpus grows by one file per weekday via the automated pipeline).
let _briefsCache: BriefMeta[] | null = null
let _briefsCacheAt = 0
const BRIEFS_TTL_MS = 60_000

export async function getAllBriefs(): Promise<BriefMeta[]> {
  const now = Date.now()
  if (_briefsCache && now - _briefsCacheAt < BRIEFS_TTL_MS) return _briefsCache

  if (!fs.existsSync(BRIEFS_DIR)) return []

  _briefsCache = fs.readdirSync(BRIEFS_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(parseBriefFile)
    .filter((b): b is BriefMeta => b !== null && b.published)
    .sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date)
      if (dateDiff !== 0) return dateDiff
      return b.edition - a.edition
    })
  _briefsCacheAt = now
  return _briefsCache
}

export function getBrief(slug: string): Brief | null {
  if (!fs.existsSync(BRIEFS_DIR)) return null

  const files = fs.readdirSync(BRIEFS_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))

  // Find file whose filename slug OR computed urlSlug matches
  for (const filename of files) {
    const fileSlug = filename.replace(/\.(mdx|md)$/, '')
    const filepath = path.join(BRIEFS_DIR, filename)
    const raw      = fs.readFileSync(filepath, 'utf8')
    const { data, content } = matter(raw)

    const isoDate  = data.date || ''
    const urlSlug  = computeUrlSlug(isoDate, data.title, data.urlSlug, fileSlug)

    if (fileSlug !== slug && urlSlug !== slug) continue

    const rawDesc = cleanSummary(data.summary) || data.metaDescription || data.description || data.excerpt || ''
    const desc    = rawDesc && !/[.!?]$/.test(rawDesc.trim()) ? `${rawDesc}…` : rawDesc

    return {
      slug:    fileSlug,
      urlSlug,
      title:       data.title    || 'Untitled',
      date:        isoDate,
      displayDate: isoDate
        ? new Date(isoDate).toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            timeZone: 'Asia/Kolkata',
          })
        : '',
      description: desc,
      summary:     desc,
      edition:     data.edition  ?? 0,
      tags:        data.tags     || [],
      commodities: Array.isArray(data.commodities) && data.commodities.length > 0
      ? data.commodities
      : deriveCommodityLabelsFromTags(data.tags),
      published:   data.published !== false,
      content,
    }
  }
  return null
}

export async function getPrevNextBriefs(currentUrlSlug: string): Promise<{
  prev: BriefMeta | null   // older edition
  next: BriefMeta | null   // newer edition
}> {
  const all = await getAllBriefs()
  const idx = all.findIndex(b => b.urlSlug === currentUrlSlug || b.slug === currentUrlSlug)
  if (idx === -1) return { prev: null, next: null }

  return {
    next: idx > 0          ? all[idx - 1] : null,   // newer (higher in sorted list)
    prev: idx < all.length - 1 ? all[idx + 1] : null,  // older (lower in sorted list)
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}
