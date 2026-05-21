import { MetadataRoute } from 'next'
import { getAllBriefs } from '@/lib/briefs'
import { getAllFlash }  from '@/lib/flash'

const BASE = 'https://bhaavbrief.in'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [briefs, flash] = await Promise.all([
    getAllBriefs(),
    getAllFlash(),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                changeFrequency: 'daily',   priority: 1.0, lastModified: new Date() },
    { url: `${BASE}/briefs`,    changeFrequency: 'daily',   priority: 0.9, lastModified: new Date() },
    { url: `${BASE}/markets`,   changeFrequency: 'hourly',  priority: 0.8, lastModified: new Date() },
    { url: `${BASE}/news`,      changeFrequency: 'hourly',  priority: 0.8, lastModified: new Date() },
    { url: `${BASE}/articles`,  changeFrequency: 'weekly',  priority: 0.7, lastModified: new Date() },
    { url: `${BASE}/learn`,     changeFrequency: 'monthly', priority: 0.5, lastModified: new Date() },
    { url: `${BASE}/invest`,    changeFrequency: 'monthly', priority: 0.5, lastModified: new Date() },
    { url: `${BASE}/about`,     changeFrequency: 'monthly', priority: 0.4, lastModified: new Date() },
    { url: `${BASE}/privacy`,   changeFrequency: 'yearly',  priority: 0.2, lastModified: new Date() },
  ]

  const briefRoutes: MetadataRoute.Sitemap = briefs.map(b => ({
    url:             `${BASE}/briefs/${b.slug}`,
    lastModified:    new Date(b.date || Date.now()),
    changeFrequency: 'weekly' as const,
    priority:        0.8,
  }))

  const flashRoutes: MetadataRoute.Sitemap = flash.map(f => ({
    url:             `${BASE}/flash/${f.slug}`,
    lastModified:    new Date(f.date || Date.now()),
    changeFrequency: 'never' as const,
    priority:        0.6,
  }))

  return [...staticRoutes, ...briefRoutes, ...flashRoutes]
}
