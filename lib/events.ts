import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const EVENTS_DIR = path.join(process.cwd(), 'content/events')

export interface EventResultMeta {
  slug:                string
  title:               string
  description:         string
  eventId:             string
  eventName:           string
  commodity:           string
  date:                string
  displayDate:         string
  result:              string
  mcxPrice:             number
  mcxChangePct:         number
  mechanism:            string
  relatedArticleSlug?: string
}

function parseEventFile(filename: string): EventResultMeta | null {
  const raw = fs.readFileSync(path.join(EVENTS_DIR, filename), 'utf8')
  const { data } = matter(raw)
  if (data.published === false) return null
  const slug = filename.replace(/\.(mdx|md)$/, '')

  return {
    slug,
    title:              data.title       ?? 'Event Result',
    description:        data.description ?? '',
    eventId:            data.eventId     ?? '',
    eventName:          data.eventName   ?? '',
    commodity:          data.commodity   ?? 'macro',
    date:               data.date        ?? '',
    displayDate: data.date
      ? new Date(data.date).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
        })
      : '',
    result:             data.result       ?? '',
    mcxPrice:           data.mcxPrice     ?? 0,
    mcxChangePct:       data.mcxChangePct ?? 0,
    mechanism:          data.mechanism    ?? '',
    relatedArticleSlug: data.relatedArticleSlug ?? undefined,
  }
}

// 60-second TTL cache, mirroring lib/briefs.ts/lib/searchIndex.ts — also
// means getEventBySlug (below) no longer needs its own file read.
let _eventsCache: EventResultMeta[] | null = null
let _eventsCacheAt = 0
const EVENTS_TTL_MS = 60_000

export async function getAllEvents(): Promise<EventResultMeta[]> {
  const now = Date.now()
  if (_eventsCache && now - _eventsCacheAt < EVENTS_TTL_MS) return _eventsCache

  if (!fs.existsSync(EVENTS_DIR)) return []

  _eventsCache = fs.readdirSync(EVENTS_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(parseEventFile)
    .filter((e): e is EventResultMeta => e !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
  _eventsCacheAt = now
  return _eventsCache
}

// Looks up the slug in the same cached array getAllEvents() builds — fixes
// the previous asymmetry where getAllEvents() accepted .md and .mdx but this
// only ever checked a literal `${slug}.mdx` path (a .md file would be listed
// but 404 on its own detail page).
export async function getEventBySlug(slug: string): Promise<EventResultMeta | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  const all = await getAllEvents()
  return all.find(e => e.slug === slug) ?? null
}
