import { getAllBriefs } from '@/lib/briefs'
import { getAllFlash }  from '@/lib/flash'
import { getAllArticles } from '@/lib/articles'

const BASE_URL  = 'https://bhaavbrief.in'
const SITE_NAME = 'BhaavBrief'

export async function GET() {
  const [briefs, flash, articles] = await Promise.all([
    getAllBriefs(),
    Promise.resolve(getAllFlash()),
    getAllArticles(),
  ])

  type FeedItem = { date: string; xml: string }

  const briefItems: FeedItem[] = briefs.slice(0, 20).map(b => ({
    date: b.date,
    xml: `
    <item>
      <title><![CDATA[${b.title}]]></title>
      <link>${BASE_URL}/briefs/${b.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/briefs/${b.slug}</guid>
      <pubDate>${new Date(b.date).toUTCString()}</pubDate>
      <description><![CDATA[${b.summary}]]></description>
      <category>${b.tags?.[0] ?? 'Commodities'}</category>
      ${(b.commodities ?? []).map(c => `<category>${c}</category>`).join('\n      ')}
      <author>brief@bhaavbrief.in (BhaavBrief)</author>
    </item>`,
  }))

  const flashItems: FeedItem[] = flash.slice(0, 20).map(f => ({
    date: f.date,
    xml: `
    <item>
      <title><![CDATA[${f.title}]]></title>
      <link>${BASE_URL}/news/${f.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/news/${f.slug}</guid>
      <pubDate>${new Date(f.date).toUTCString()}</pubDate>
      <description><![CDATA[${f.excerpt}]]></description>
      <category>${f.category}</category>
      <author>brief@bhaavbrief.in (BhaavBrief)</author>
    </item>`,
  }))

  const articleItems: FeedItem[] = articles.slice(0, 10).map(a => ({
    date: a.date,
    xml: `
    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${BASE_URL}/articles/${a.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/articles/${a.slug}</guid>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
      <description><![CDATA[${a.description}]]></description>
      <category>${a.commodity}</category>
      ${a.tags.map(t => `<category>${t}</category>`).join('\n      ')}
      <author>brief@bhaavbrief.in (BhaavBrief)</author>
    </item>`,
  }))

  const allItems = [...briefItems, ...flashItems, ...articleItems]
    .filter(i => i.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30)
    .map(i => i.xml)
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
>
  <channel>
    <title>${SITE_NAME} — India's Commodity Intelligence</title>
    <link>${BASE_URL}</link>
    <description>Daily MCX commodity intelligence for India's traders, investors and merchants. Published every weekday at 9:30 AM IST.</description>
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
    ${allItems}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type':  'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
