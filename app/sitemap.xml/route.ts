import { getAllBriefs }   from '@/lib/briefs'
import { getAllArcs }     from '@/lib/arcs'
import { getAllEvents }   from '@/lib/events'

export const revalidate = 3600 // rebuild sitemap cache every hour

const BASE = 'https://bhaavbrief.in'

const STATIC_PAGES = [
  { url: BASE,                      priority: '1.0', changefreq: 'daily'   },
  { url: `${BASE}/briefs`,          priority: '0.9', changefreq: 'daily'   },
  { url: `${BASE}/markets`,         priority: '0.8', changefreq: 'hourly'  },
  { url: `${BASE}/options`,         priority: '0.9', changefreq: 'hourly'  },
  { url: `${BASE}/options/gold`,        priority: '0.85', changefreq: 'hourly' },
  { url: `${BASE}/options/silver`,      priority: '0.85', changefreq: 'hourly' },
  { url: `${BASE}/options/crude-oil`,   priority: '0.85', changefreq: 'hourly' },
  { url: `${BASE}/options/natural-gas`, priority: '0.8',  changefreq: 'hourly' },
  { url: `${BASE}/options/copper`,      priority: '0.8',  changefreq: 'hourly' },
  { url: `${BASE}/calendar`,        priority: '0.8', changefreq: 'hourly'  },
  { url: `${BASE}/news`,            priority: '0.8', changefreq: 'hourly'  },
  { url: `${BASE}/learn`,                            priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/mcx-lot-sizes`,             priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/mcx-margin-calculation`,    priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/mcx-gold-contracts`,        priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/mcx-commodity-tax-india`,   priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/mcx-rollover`,              priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/gold-etf-vs-mcx-gold`,     priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/mcx-margin-calculator`,     priority: '0.8', changefreq: 'daily'   },
  { url: `${BASE}/learn/best-time-to-trade-mcx`,   priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/why-usdinr-affects-mcx-gold`, priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/what-is-comex`,                 priority: '0.8', changefreq: 'monthly' },
  { url: `${BASE}/learn/mcx-contract-expiry`,          priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/comex-vs-mcx-gold`,            priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/mcx-circuit-limits`,           priority: '0.7', changefreq: 'monthly' },
  { url: `${BASE}/learn/how-much-money-to-start-mcx-trading`, priority: '0.8', changefreq: 'monthly' },
  { url: `${BASE}/learn/mcx-gold-vs-physical-gold`,   priority: '0.8', changefreq: 'monthly' },
  { url: `${BASE}/learn/which-mcx-commodity-to-trade`, priority: '0.8', changefreq: 'monthly' },
  { url: `${BASE}/learn/mcx-trading-hours`,            priority: '0.8', changefreq: 'monthly' },
  { url: `${BASE}/learn/mcx-order-types`,              priority: '0.8', changefreq: 'monthly' },
  { url: `${BASE}/invest`,          priority: '0.5', changefreq: 'monthly' },
  { url: `${BASE}/event-impact-data`, priority: '0.6', changefreq: 'weekly' },
  { url: `${BASE}/about`,           priority: '0.4', changefreq: 'monthly' },
  { url: `${BASE}/privacy`,         priority: '0.2', changefreq: 'yearly'  },
  { url: `${BASE}/terms`,           priority: '0.2', changefreq: 'yearly'  },
  { url: `${BASE}/commodities/gold`,        priority: '0.9', changefreq: 'hourly' },
  { url: `${BASE}/commodities/silver`,      priority: '0.9', changefreq: 'hourly' },
  { url: `${BASE}/commodities/crude-oil`,   priority: '0.9', changefreq: 'hourly' },
  { url: `${BASE}/commodities/copper`,      priority: '0.8', changefreq: 'hourly' },
  { url: `${BASE}/commodities/natural-gas`, priority: '0.8', changefreq: 'hourly' },
  { url: `${BASE}/commodities/zinc`,        priority: '0.7', changefreq: 'hourly' },
  { url: `${BASE}/commodities/aluminium`,   priority: '0.7', changefreq: 'hourly' },
  { url: `${BASE}/commodities/lead`,        priority: '0.7', changefreq: 'hourly' },
  { url: `${BASE}/commodities/nickel`,      priority: '0.7', changefreq: 'hourly' },
  { url: `${BASE}/events`,                  priority: '0.6', changefreq: 'daily'  },
  { url: `${BASE}/options/strategy`,        priority: '0.7', changefreq: 'monthly'},
]

function entry(url: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

export async function GET() {
  try {
    const now = new Date().toISOString()
    const [briefs, events] = await Promise.all([
      getAllBriefs(),
      getAllEvents(),
    ])
    const arcs = getAllArcs()

    const staticEntries = STATIC_PAGES.map(p =>
      entry(p.url, now, p.changefreq, p.priority)
    )

    const briefEntries = briefs.map(b =>
      entry(`${BASE}/briefs/${b.urlSlug}`, b.date ? new Date(b.date).toISOString() : now, 'never', '0.8')
    )

    // /flash and /articles are deliberately excluded from sitemap.xml —
    // high volume (~350+ URLs) and covered separately by news-sitemap.xml
    // for Google News/Discover discovery (48h window). Keeping them out of
    // the general sitemap prevents crawl budget dilution without blocking
    // indexation (pages are indexable; news-sitemap handles fresh discovery).
    const arcEntries = arcs.map(a =>
      entry(`${BASE}/arcs/${a.id}`, a.startDate ? new Date(a.startDate).toISOString() : now, a.status === 'active' ? 'daily' : 'never', '0.6')
    )

    const eventEntries = events.map(e =>
      entry(`${BASE}/events/${e.slug}`, e.date ? new Date(e.date).toISOString() : now, 'never', '0.6')
    )

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...briefEntries, ...arcEntries, ...eventEntries].join('\n')}
</urlset>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800',
      },
    })
  } catch (err) {
    console.error('Sitemap generation failed:', err)
    // Return an empty-but-valid sitemap so Google sees zero URLs, not one
    // stale URL that would cause it to de-index everything else.
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`
    return new Response(fallback, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }
}
