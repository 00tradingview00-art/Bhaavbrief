import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BRIEFS_DIR = path.join(process.cwd(), 'content/briefs')

export interface BriefMeta {
  slug: string
  title: string
  date: string
  edition: number
  summary: string
  tags: string[]
  commodities: string[]
  published: boolean
}

export interface Brief extends BriefMeta {
  content: string
}

export function getAllBriefs(): BriefMeta[] {
  if (!fs.existsSync(BRIEFS_DIR)) return []

  const files = fs.readdirSync(BRIEFS_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))

  return files.map(filename => {
    const slug = filename.replace(/\.(mdx|md)$/, '')
    const raw = fs.readFileSync(path.join(BRIEFS_DIR, filename), 'utf8')
    const { data } = matter(raw)
    return {
      slug,
      title:       data.title       || 'Untitled',
      date:        data.date        || '',
      edition:     data.edition     || 0,
      summary:     data.summary     || '',
      tags:        data.tags        || [],
      commodities: data.commodities || [],
      published:   data.published   !== false,
    }
  })
    .filter(b => b.published)
    .sort((a, b) => b.date.localeCompare(a.date)) // sort by frontmatter date, newest first
}

export function getBrief(slug: string): Brief | null {
  const filePath = path.join(BRIEFS_DIR, `${slug}.mdx`)
  const altPath  = path.join(BRIEFS_DIR, `${slug}.md`)
  const target   = fs.existsSync(filePath) ? filePath : fs.existsSync(altPath) ? altPath : null
  if (!target) return null

  const raw = fs.readFileSync(target, 'utf8')
  const { data, content } = matter(raw)

  return {
    slug,
    title:       data.title       || 'Untitled',
    date:        data.date        || '',
    edition:     data.edition     || 0,
    summary:     data.summary     || '',
    tags:        data.tags        || [],
    commodities: data.commodities || [],
    published:   data.published   !== false,
    content,
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}
