import { MetadataRoute } from 'next'
import { getAllBriefs } from '@/lib/briefs'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://bhaavbrief.in'
  const briefs  = await getAllBriefs()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url:             baseUrl,
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        1.0,
    },
    {
      url:             `${baseUrl}/briefs`,
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        0.9,
    },
  ]

  const briefRoutes: MetadataRoute.Sitemap = briefs.map(brief => ({
    url:             `${baseUrl}/briefs/${brief.slug}`,
    lastModified:    new Date(brief.date || Date.now()),
    changeFrequency: 'weekly' as const,
    priority:        0.8,
  }))

  return [...staticRoutes, ...briefRoutes]
}
