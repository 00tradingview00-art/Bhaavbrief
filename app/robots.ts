import { MetadataRoute } from 'next'

const BASE = 'https://bhaavbrief.in'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow:     '/',
        disallow:  ['/api/'],
      },
      {
        userAgent: [
          'GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'anthropic-ai',
          'Google-Extended', 'PerplexityBot', 'Perplexity-User',
          'CCBot', 'Applebot-Extended', 'meta-externalagent',
        ],
        allow:     '/',
        disallow:  ['/api/'],
      },
    ],
    sitemap: [
      `${BASE}/sitemap.xml`,
      `${BASE}/news-sitemap.xml`,
    ],
    host: BASE,
  }
}
