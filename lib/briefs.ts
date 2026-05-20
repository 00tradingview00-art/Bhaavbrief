import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BRIEFS_DIR = path.join(process.cwd(), 'content/briefs')

function cleanSummary(raw: string): string {
  if (!raw) return ''
  const stripped = raw.replace(/^\*|\*$/g, '').trim()
  if (/^(edition\s+\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\s+\w+\s+\d{4})/i.test(stripped)) return ''
  return raw
}

export interface BriefMeta {
  slug:        string
  title:       string
  date:        string        // ISO — used for schema.org, OG, <time>
  displayDate: string        // human-readable — use this for display
  description: string        // alias for summary / metaDescription
  summary:     string        // kept for backward compat with slug page
  edition:     number
  tags:        string[]
  commodities: string[]
  published:   boolean
}

export interface Brief extends BriefMeta {
  content: string
}

export async function getAllBriefs(): Promise<BriefMeta[]> {
  if (!fs.existsSync(BRIEFS_DIR)) return []

  const files = fs.readdirSync(BRIEFS_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))

  return files
    .map(filename => {
      const slug = filename.replace(/\.(mdx|md)$/, '')
      const raw  = fs.readFileSync(path.join(BRIEFS_DIR, filename), 'utf8')
      const { data } = matter(raw)

      const isoDate  = data.date || ''
      const desc     = cleanSummary(data.summary) || data.metaDescription || data.description || data.excerpt || ''

      return {
        slug,
        title:       data.title       || 'Untitled',
        date:        isoDate,
        displayDate: isoDate
          ? new Date(isoDate).toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              timeZone: 'Asia/Kolkata',
            })
          : '',
        description: desc,
        summary:     desc,
        edition:     data.edition     || 0,
        tags:        data.tags        || [],
        commodities: data.commodities || [],
        published:   data.published   !== false,
      }
    })
    .filter(b => b.published)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getBrief(slug: string): Brief | null {
  const mdxPath = path.join(BRIEFS_DIR, `${slug}.mdx`)
  const mdPath  = path.join(BRIEFS_DIR, `${slug}.md`)
  const target  = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null
  if (!target) return null

  const raw = fs.readFileSync(target, 'utf8')
  const { data, content } = matter(raw)

  const isoDate = data.date || ''
  const desc    = cleanSummary(data.summary) || data.metaDescription || data.description || data.excerpt || ''

  return {
    slug,
    title:       data.title       || 'Untitled',
    date:        isoDate,
    displayDate: isoDate
      ? new Date(isoDate).toLocaleDateString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          timeZone: 'Asia/Kolkata',
        })
      : '',
    description: desc,
    summary:     desc,
    edition:     data.edition     || 0,
    tags:        data.tags        || [],
    commodities: data.commodities || [],
    published:   data.published   !== false,
    content,
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}
