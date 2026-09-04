/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  experimental: {
    mdxRs: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
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
      // Instagram bio link — sends visitors to markets
      { source: '/ig', destination: '/markets', permanent: false },
      // Broken "ay2026" slugs (slug-generator bug, capital M stripped from "May")
      { source: '/articles/:slug(.*ay2026.*)', destination: '/briefs', permanent: true },
      { source: '/briefs/:slug(.*ay2026.*)',   destination: '/briefs', permanent: true },
    ]
  },
}

export default nextConfig
