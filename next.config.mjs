/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  experimental: {
    mdxRs: false,
  },
  // Files read from disk at request time — listed explicitly so the
  // serverless bundles always ship them, rather than relying on tracing:
  // - the holiday calendar, for every route that asks "is today a trading
  //   day" (scripts/lib/holidays.js);
  // - the daily history files, for /api/pro/data (lib/correlation.ts).
  outputFileTracingIncludes: {
    '/**': ['./data/market-holidays.json'],
    '/api/pro/data': ['./data/history/**'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
    // Sitewide next/image usage is just the nav logo (components/Nav.tsx) —
    // rarely changes, so cache the optimizer output long instead of Next's
    // 60s default.
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      // Raw /public image files (logos etc.) serve max-age=0 by default —
      // long-cache them since they change rarely; rename the file rather than
      // overwriting in place if one is ever replaced.
      {
        source: '/:all*(png|jpg|jpeg|gif|svg|webp|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // dev.bhaavbrief.in is the staging domain (real Cashfree sandbox testing,
      // see IS_STAGING in .env.example) — never indexable. app/robots.ts also
      // returns a blanket disallow there; this is the belt-and-suspenders header
      // in case anything crawls a page directly without checking robots.txt first.
      {
        source: '/(.*)',
        has: [{ type: 'host', value: 'dev.bhaavbrief.in' }],
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      // www.bhaavbrief.in and bhaavbrief.in were both indexable, splitting authority
      // and duplicating pages (e.g. /learn showed as two separate URLs in Semrush).
      // The primary fix is a Vercel dashboard domain redirect; this is the fallback
      // for any request that reaches the app on the www host regardless.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.bhaavbrief.in' }],
        destination: 'https://bhaavbrief.in/:path*',
        permanent: true,
      },
      { source: '/articles', destination: '/news', permanent: true },
      // /events listed a single July write-up and nothing linked to it; the
      // calendar is where events live. Individual /events/[slug] pages stay.
      { source: '/events', destination: '/calendar', permanent: true },
      // Instagram bio link — sends visitors to markets
      { source: '/ig', destination: '/markets', permanent: false },
      // Broken "ay2026" slugs (slug-generator bug, capital M stripped from "May")
      { source: '/articles/:slug(.*ay2026.*)', destination: '/briefs', permanent: true },
      { source: '/briefs/:slug(.*ay2026.*)',   destination: '/briefs', permanent: true },
      // Duplicate evening close briefs published for the same session (two
      // workflow runs minutes apart, 21 & 22 Sep 2026 — see
      // evening-close-brief.yml's checkout note). The first-published brief
      // of each pair is kept; the later copy points to it.
      { source: '/articles/2026-09-21-mcx-close-22sep2026-natgas-leads-selloff', destination: '/articles/2026-09-21-mcx-close-22sep2026-natgas-selloff', permanent: true },
      { source: '/articles/2026-09-22-mcx-close-23sep2026-natgas-surge', destination: '/articles/2026-09-22-mcx-close-23sep2026-silver-surge-crude-plunge', permanent: true },
    ]
  },
}

export default nextConfig
