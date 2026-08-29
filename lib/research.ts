import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const RESEARCH_DIR = path.join(process.cwd(), 'content/research')

export interface ResearchMeta {
  slug:        string
  title:       string
  description: string
  date:        string
  eventId:     string | null
  commodity:   string
  commodities: string[]
  premium:     boolean
  published:   boolean
  tags:        string[]
  edition:     string
  readingMinutes: number
  displayDate: string
}

export function getAllResearch(): ResearchMeta[] {
  if (!fs.existsSync(RESEARCH_DIR)) return []

  const files = fs.readdirSync(RESEARCH_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .sort((a, b) => b.localeCompare(a))

  return files
    .map(file => {
      try {
        const raw  = fs.readFileSync(path.join(RESEARCH_DIR, file), 'utf8')
        const { data, content } = matter(raw)
        const slug = file.replace(/\.(mdx|md)$/, '')

        const wordCount      = content.split(/\s+/).length
        const readingMinutes = Math.max(1, Math.round(wordCount / 200))

        return {
          slug,
          title:       data.title       ?? 'Research',
          description: data.description ?? '',
          date:        data.date        ?? '',
          eventId:     data.event_id    ?? null,
          commodity:   data.commodity   ?? 'macro',
          commodities: data.commodities ?? [],
          premium:     data.premium     !== false,
          published:   data.published   === true,
          tags:        data.tags        ?? [],
          edition:     data.edition     ?? 'macro-research',
          readingMinutes,
          displayDate: data.date
            ? new Date(data.date).toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                timeZone: 'Asia/Kolkata',
              })
            : '',
        } satisfies ResearchMeta
      } catch {
        return null
      }
    })
    .filter((r): r is ResearchMeta => r !== null && r.published)
}

export function getResearchBySlug(slug: string): { meta: ResearchMeta; content: string } | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null

  const filepath = fs.existsSync(path.join(RESEARCH_DIR, `${slug}.mdx`))
    ? path.join(RESEARCH_DIR, `${slug}.mdx`)
    : fs.existsSync(path.join(RESEARCH_DIR, `${slug}.md`))
    ? path.join(RESEARCH_DIR, `${slug}.md`)
    : null

  if (!filepath) return null

  const raw  = fs.readFileSync(filepath, 'utf8')
  const { data, content } = matter(raw)

  if (data.published !== true) return null

  const wordCount      = content.split(/\s+/).length
  const readingMinutes = Math.max(1, Math.round(wordCount / 200))

  const meta: ResearchMeta = {
    slug,
    title:       data.title       ?? 'Research',
    description: data.description ?? '',
    date:        data.date        ?? '',
    eventId:     data.event_id    ?? null,
    commodity:   data.commodity   ?? 'macro',
    commodities: data.commodities ?? [],
    premium:     data.premium     !== false,
    published:   true,
    tags:        data.tags        ?? [],
    edition:     data.edition     ?? 'macro-research',
    readingMinutes,
    displayDate: data.date
      ? new Date(data.date).toLocaleDateString('en-IN', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
          timeZone: 'Asia/Kolkata',
        })
      : '',
  }

  return { meta, content }
}
