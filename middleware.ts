import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Only /account requires sign-in via middleware redirect.
// /options and /pro are intentionally excluded:
//   - /options: synthetic monitor checks it unauthenticated every 15 min (M-01, M-05, M-06)
//   - /pro: unauthenticated visitors must see the pricing page, not a redirect loop
const isProtectedPage = createRouteMatcher(['/account'])

export default clerkMiddleware((auth, req) => {
  if (isProtectedPage(req)) auth.protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and ALL /api/* routes.
    // API routes excluded entirely: cron routes use CRON_SECRET, Kite OAuth callback
    // must be public, /api/subscribe must be public for email capture.
    '/((?!api/|_next/static|_next/image|favicon.ico|sitemap.xml|news-sitemap.xml|feed.xml|llms.txt|robots.txt).*)',
  ],
}
