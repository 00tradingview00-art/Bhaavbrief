import { MetadataRoute } from 'next'
import { getAllBriefs } from '@/lib/briefs'
import { getAllFlash }  from '@/lib/flash'

const BASE = 'https://bhaavbrief.in'

const COMMODITIES = ['gold', 'silver', 'crude-oil', 'copper', 'natural-gas']

export function generateSitemaps() {
  return [
    { id: 'static' },
    { id: 'briefs' },
    { id: 'flash' },
  ]
}

export default async function sitemap(
  { id }: { id: string },
): Promise<MetadataRoute.Sitemap> {
  switch (id) {
    case 'static':
      return [
        { url: BASE,                      changeFrequency: 'daily',   priority: 1.0, lastModified: new Date() },
        { url: `${BASE}/briefs`,          changeFrequency: 'daily',   priority: 0.9, lastModified: new Date() },
        { url: `${BASE}/markets`,         changeFrequency: 'hourly',  priority: 0.8, lastModified: new Date() },
        { url: `${BASE}/news`,            changeFrequency: 'hourly',  priority: 0.8, lastModified: new Date() },
{ url: `${BASE}/learn`,           changeFrequency: 'monthly', priority: 0.6, lastModified: new Date() },
        { url: `${BASE}/invest`,          changeFrequency: 'monthly', priority: 0.5, lastModified: new Date() },
        { url: `${BASE}/about`,           changeFrequency: 'monthly', priority: 0.4, lastModified: new Date() },
        { url: `${BASE}/privacy`,         changeFrequency: 'yearly',  priority: 0.2, lastModified: new Date() },
        ...COMMODITIES.map(c => ({
          url:             `${BASE}/commodities/${c}`,
          changeFrequency: 'hourly' as const,
          priority:        0.9,
          lastModified:    new Date(),
        })),
      ]

    case 'briefs': {
      const briefs = await getAllBriefs()
      return briefs.map(b => ({
        url:             `${BASE}/briefs/${b.slug}`,
        lastModified:    new Date(b.date || Date.now()),
        changeFrequency: 'never' as const,
        priority:        0.8,
      }))
    }

    case 'flash': {
      const flash = await getAllFlash()
      return flash.map(f => ({
        url:             `${BASE}/flash/${f.slug}`,
        lastModified:    new Date(f.date || Date.now()),
        changeFrequency: 'never' as const,
        priority:        0.6,
      }))
    }

    default:
      return []
  }
}
