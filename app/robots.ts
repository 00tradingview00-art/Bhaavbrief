import { MetadataRoute } from 'next'

const BASE = 'https://bhaavbrief.in'

export default function robots(): MetadataRoute.Robots {
  // dev.bhaavbrief.in (real Cashfree sandbox testing — see IS_STAGING in
  // .env.example) must never be crawled/indexed. This env var is the only
  // thing that should ever be set differently there vs. Production.
  if (process.env.IS_STAGING === 'true') {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

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
    ],
    host: BASE,
  }
}
