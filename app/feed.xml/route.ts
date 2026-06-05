import { getAllBriefs }   from '@/lib/briefs'
import { getAllFlash }    from '@/lib/flash'
import { getAllArticles } from '@/lib/articles'

const BASE_URL  = 'https://bhaavbrief.in'
const SITE_NAME = 'BhaavBrief'

function escapeXml(str: string): string {
  return (str ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;')
}

// Google News requires <news:news> elements and ISO 8601 pubDates.
// We include them in the main feed so one URL covers both RSS readers
// and the Google News Publisher Center crawler.
function newsBlock(title: string, pubIso: string) {
  return `      <news:news>
        <news:publication>
          <news:name>${SITE_NAME}</news:name>
          <news:language>en</news:language>
        </news:publication>
        <news:publication_date>${pubIso}</news:publication_date>
        <news:title>${escapeXml(title)}</news:title>
      </news:news>`
}

export async function GET() {
  const [briefs, flash, articles] = await Promise.all([
    getAllBriefs(),
    Promise.resolve(getAllFlash()),
    getAllArticles(),
  ])

  type FeedItem = { date: string; xml: string }

  const briefItems: FeedItem[] = briefs.slice(0, 20).map(b => {
    const pub = new Date(b.date)
    const iso = pub.toISOString()
    return {
      date: b.date,
      xml: `
    <item>
      <title><![CDATA[${b.title}]]></title>
      <link>${BASE_URL}/briefs/${b.urlSlug ?? b.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/briefs/${b.urlSlug ?? b.slug}</guid>
      <pubDate>${pub.toUTCString()}</pubDate>
      <description><![CDATA[${b.description ?? b.summary ?? ''}]]></description>
      <category>${b.tags?.[0] ?? 'Commodities'}</category>
      ${(b.tags ?? []).slice(1).map((t: string) => `<category>${escapeXml(t)}</category>`).join('\n      ')}
${newsBlock(b.title, iso)}
      <author>brief@bhaavbrief.in (BhaavBrief)</author>
    </item>`,
    }
  })

  const flashItems: FeedItem[] = flash.slice(0, 20).map(f => {
    const pub = new Date(f.date)
    const iso = pub.toISOString()
    return {
      date: f.date,
      xml: `
    <item>
      <title><![CDATA[${f.title}]]></title>
      <link>${BASE_URL}/flash/${f.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/flash/${f.slug}</guid>
      <pubDate>${pub.toUTCString()}</pubDate>
      <description><![CDATA[${f.excerpt ?? ''}]]></description>
      <category>${f.category}</category>
${newsBlock(f.title, iso)}
      <author>brief@bhaavbrief.in (BhaavBrief)</author>
    </item>`,
    }
  })

  const articleItems: FeedItem[] = articles.slice(0, 10).map(a => {
    const pub = new Date(a.date)
    const iso = pub.toISOString()
    return {
      date: a.date,
      xml: `
    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${BASE_URL}/articles/${a.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/articles/${a.slug}</guid>
      <pubDate>${pub.toUTCString()}</pubDate>
      <description><![CDATA[${a.description ?? ''}]]></description>
      <category>${escapeXml(a.commodity ?? '')}</category>
      ${a.tags.map((t: string) => `<category>${escapeXml(t)}</category>`).join('\n      ')}
${newsBlock(a.title, iso)}
      <author>brief@bhaavbrief.in (BhaavBrief)</author>
    </item>`,
    }
  })

  const allItems = [...briefItems, ...flashItems, ...articleItems]
    .filter(i => i.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 40)
    .map(i => i.xml)
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
>
  <channel>
    <title>${SITE_NAME} — India's Daily Commodity Intelligence</title>
    <link>${BASE_URL}</link>
    <description>Daily MCX commodity intelligence for India's traders, investors and merchants. Published every weekday at 9:30 AM IST.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${BASE_URL}/logo.png</url>
      <title>${SITE_NAME}</title>
      <link>${BASE_URL}</link>
    </image>
    <managingEditor>brief@bhaavbrief.in (BhaavBrief)</managingEditor>
    <webMaster>brief@bhaavbrief.in (BhaavBrief)</webMaster>
    <category>Business/Finance</category>
    <ttl>60</ttl>
    ${allItems}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type':  'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  })
}
