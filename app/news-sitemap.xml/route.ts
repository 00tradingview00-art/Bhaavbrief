import { getAllFlash } from '@/lib/flash'

const BASE = 'https://bhaavbrief.in'

// Google News sitemaps must only include articles published in the last 48 hours.
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000

export async function GET() {
  const flash = await getAllFlash()
  const cutoff = Date.now() - FORTY_EIGHT_HOURS

  const recent = flash.filter(f => {
    const ts = new Date(f.date).getTime()
    return !isNaN(ts) && ts >= cutoff
  })

  const urls = recent.map(f => {
    const pubDate = new Date(f.date).toISOString()
    const title   = escapeXml(f.title)
    return `  <url>
    <loc>${BASE}/flash/${f.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>BhaavBrief</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800',
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
