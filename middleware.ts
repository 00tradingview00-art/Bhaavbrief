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
    // Must cover /api/* too: several Pro API routes (options chain, aav-history,
    // oi-history, strategy-margin, razorpay/checkout, razorpay/poll-status) call
    // auth()/isProUser(), which throws "Clerk: auth() was called but Clerk can't
    // detect usage of clerkMiddleware()" if this middleware never ran on their
    // path — confirmed live in production (real 500s on every one of those
    // routes, including checkout, until this fix). Excluding /api/ entirely was
    // correct when this file was first written (no API route called auth() yet)
    // but went stale as those routes were added later and nobody widened the
    // matcher. clerkMiddleware() running on a route that never calls auth() or
    // auth.protect() (cron routes using CRON_SECRET, the Kite OAuth callback,
    // /api/subscribe) is a harmless no-op pass-through — isProtectedPage above
    // stays scoped to /account only, so nothing new gets blocked/redirected.
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|news-sitemap.xml|feed.xml|llms.txt|robots.txt).*)',
  ],
}
