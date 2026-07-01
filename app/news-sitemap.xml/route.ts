import { getAllBriefs }   from '@/lib/briefs'
import { getAllFlash }    from '@/lib/flash'
import { getAllArticles } from '@/lib/articles'

export const revalidate = 1800 // news sitemap: rebuild every 30 min

const BASE = 'https://bhaavbrief.in'

// Google News sitemaps must only include articles published in the last 48 hours.
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000

function newsEntry(loc: string, pubDate: string, title: string): string {
  return `  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>BhaavBrief</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`
}

export async function GET() {
  const [briefs, flash, articles] = await Promise.all([getAllBriefs(), getAllFlash(), getAllArticles()])
  const cutoff = Date.now() - FORTY_EIGHT_HOURS

  const briefEntries = briefs
    .filter(b => { const ts = new Date(b.date).getTime(); return !isNaN(ts) && ts >= cutoff })
    .map(b => newsEntry(`${BASE}/briefs/${b.urlSlug}`, new Date(b.date).toISOString(), escapeXml(b.title)))

  const flashEntries = flash
    .filter(f => { const ts = new Date(f.date).getTime(); return !isNaN(ts) && ts >= cutoff })
    .map(f => newsEntry(`${BASE}/flash/${f.slug}`, new Date(f.date).toISOString(), escapeXml(f.title)))

  const articleEntries = articles
    .filter(a => { const ts = new Date(a.date).getTime(); return !isNaN(ts) && ts >= cutoff })
    .map(a => newsEntry(`${BASE}/articles/${a.slug}`, new Date(a.date).toISOString(), escapeXml(a.title)))

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${[...briefEntries, ...articleEntries, ...flashEntries].join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=900',
    },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;')
}
