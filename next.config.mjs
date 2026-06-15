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
  async redirects() {
    return [
      { source: '/articles', destination: '/news', permanent: true },
      // Broken "ay2026" slugs (slug-generator bug, capital M stripped from "May")
      { source: '/articles/:slug(.*ay2026.*)', destination: '/briefs', permanent: true },
      { source: '/briefs/:slug(.*ay2026.*)',   destination: '/briefs', permanent: true },
    ]
  },
}

export default nextConfig
