/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  experimental: {
    mdxRs: false,
  },
  // ESLint was only just introduced to this codebase (no config existed before)
  // and surfaces pre-existing violations across many files — don't block
  // production builds on those until they're cleaned up incrementally.
  // `npm run lint` still runs the full strict set for local/CI use.
  eslint: {
    ignoreDuringBuilds: true,
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
    ]
  },
  async redirects() {
    return [
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
