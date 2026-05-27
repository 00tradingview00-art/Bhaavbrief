import { MetadataRoute } from 'next'
import { getAllBriefs }   from '@/lib/briefs'
import { getAllFlash }    from '@/lib/flash'
import { getAllArticles } from '@/lib/articles'

const BASE = 'https://bhaavbrief.in'

const COMMODITIES = ['gold', 'silver', 'crude-oil', 'copper', 'natural-gas']

// force-dynamic: sitemap must always reflect the latest committed content.
// ISR (revalidate) causes stale sitemaps between Vercel deployments.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [briefs, flash, articles] = await Promise.all([
    getAllBriefs(),
    Promise.resolve(getAllFlash()),
    getAllArticles(),
  ])

  return [
    // Core pages
    { url: BASE,                 changeFrequency: 'daily',   priority: 1.0, lastModified: new Date() },
    { url: `${BASE}/briefs`,     changeFrequency: 'daily',   priority: 0.9, lastModified: new Date() },
    { url: `${BASE}/markets`,    changeFrequency: 'hourly',  priority: 0.8, lastModified: new Date() },
    { url: `${BASE}/news`,       changeFrequency: 'hourly',  priority: 0.8, lastModified: new Date() },
    { url: `${BASE}/learn`,      changeFrequency: 'monthly', priority: 0.6, lastModified: new Date() },
    { url: `${BASE}/invest`,     changeFrequency: 'monthly', priority: 0.5, lastModified: new Date() },
    { url: `${BASE}/about`,      changeFrequency: 'monthly', priority: 0.4, lastModified: new Date() },
    { url: `${BASE}/privacy`,    changeFrequency: 'yearly',  priority: 0.2, lastModified: new Date() },

    // Commodity pages
    ...COMMODITIES.map(c => ({
      url:             `${BASE}/commodities/${c}`,
      changeFrequency: 'hourly' as const,
      priority:        0.9,
      lastModified:    new Date(),
    })),

    // Daily briefs
    ...briefs.map(b => ({
      url:             `${BASE}/briefs/${b.slug}`,
      lastModified:    new Date(b.date || Date.now()),
      changeFrequency: 'never' as const,
      priority:        0.8,
    })),

    // Flash intelligence
    ...flash.map(f => ({
      url:             `${BASE}/flash/${f.slug}`,
      lastModified:    new Date(f.date || Date.now()),
      changeFrequency: 'never' as const,
      priority:        0.6,
    })),

    // Market intelligence articles
    ...articles.map(a => ({
      url:             `${BASE}/articles/${a.slug}`,
      lastModified:    new Date(a.date || Date.now()),
      changeFrequency: 'never' as const,
      priority:        0.7,
    })),
  ]
}
