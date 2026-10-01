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
        // /api/og renders the link-preview images pages point to; blocking
        // it stopped crawlers that honour robots.txt from showing them.
        allow:     ['/', '/api/og'],
        disallow:  ['/api/'],
      },
      {
        userAgent: [
          'GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'anthropic-ai',
          'Google-Extended', 'PerplexityBot', 'Perplexity-User',
          'CCBot', 'Applebot-Extended', 'meta-externalagent',
        ],
        allow:     ['/', '/api/og'],
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
