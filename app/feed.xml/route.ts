import { getAllBriefs } from '@/lib/briefs'

const BASE_URL  = 'https://bhaavbrief.in'
const SITE_NAME = 'BhaavBrief'

export async function GET() {
  const briefs = (await getAllBriefs()).slice(0, 20)

  const items = briefs.map(brief => `
    <item>
      <title><![CDATA[${brief.title}]]></title>
      <link>${BASE_URL}/briefs/${brief.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/briefs/${brief.slug}</guid>
      <pubDate>${new Date(brief.date).toUTCString()}</pubDate>
      <description><![CDATA[${brief.summary}]]></description>
      <category>${brief.tags?.[0] ?? 'Commodities'}</category>
      ${(brief.commodities ?? []).map(c => `<category>${c}</category>`).join('\n      ')}
      <author>brief@bhaavbrief.in (BhaavBrief)</author>
    </item>
  `).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
>
  <channel>
    <title>${SITE_NAME} — India's Commodity Intelligence</title>
    <link>${BASE_URL}</link>
    <description>Daily MCX and NCDEX commodity intelligence for Indian traders and merchants. Published every weekday at 7 AM IST.</description>
    <language>en-in</language>
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
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type':  'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
