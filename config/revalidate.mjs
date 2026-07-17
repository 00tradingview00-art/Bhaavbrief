/**
 * config/revalidate.mjs — P-03 ISR policy: the one place revalidate windows
 * are named and justified. Next.js requires `export const revalidate = <N>`
 * to be a literal number in each page/route file (it statically extracts the
 * value at build time and does not resolve an imported identifier), so this
 * file cannot be imported by app/ pages directly — instead every page/route
 * file writes one of the literal values below with a comment naming the
 * tier, and scripts/check-revalidate-policy.mjs (run in CI, see test.yml)
 * greps every page/route file and fails if:
 *   (a) its literal `revalidate` value isn't one of REVALIDATE below, or
 *   (b) it imports live/intra-day data (lib/snapshot, lib/prices, lib/briefs,
 *       lib/flash, lib/articles, lib/options, lib/tradingCalendar) but
 *       declares no revalidate/dynamic export at all — i.e. is silently
 *       full-SSG and will only ever refresh on the next deploy. This is
 *       exactly the D-01 failure mode: `/briefs` and `/feed.xml` were both
 *       found in this state during the Part 5 audit and fixed alongside
 *       this policy, not caught by any prior check.
 *
 * "Any route whose data updates intra-day is either SSR/edge or ISR ≤ 15
 * min — never default-SSG." (master doc, Part 5, P-03)
 */
export const REVALIDATE = {
  LIVE:      0,     // SSR every request — prices, health, options chain API
  VERY_FAST: 30,    // markets dashboard
  NEAR_LIVE: 60,    // homepage, options page, news listing, about — ticker-adjacent pages
  FAST:      300,   // pages whose underlying data can change within the trading day
  MEDIUM:    900,   // calendar — the ceiling for listing/dashboard-style live-data pages
  HOURLY:    3600,  // individual briefs/arcs/articles/events detail pages — content-item
                     // pages are immutable once published (corrections are an explicit
                     // editorial event, not a staleness problem) and AI-thesis cache
  HALF_DAY:  1800,  // news sitemap
}

// Routes that read live/intra-day data (see the import list above) and MUST
// declare revalidate <= REVALIDATE.MEDIUM or `dynamic = 'force-dynamic'`.
// Routes intentionally exempt (e.g. a live-data import used only for a
// one-time build-time snapshot with no user-facing staleness risk) can be
// added to LIVE_DATA_EXEMPT with a one-line reason — none exist today.
export const LIVE_DATA_IMPORT_MARKERS = [
  '@/lib/snapshot',
  '@/lib/prices',
  '@/lib/briefs',
  '@/lib/flash',
  '@/lib/articles',
  '@/lib/options',
  '@/lib/tradingCalendar',
]

// Sitemaps: crawl-budget/SEO freshness has a different tolerance than
// user-visible content staleness (M-04/D-01's concern) — their revalidate
// windows are chosen deliberately, not left as an accidental default-SSG.
export const LIVE_DATA_EXEMPT = [
  'app/sitemap.xml/route.ts',
  'app/news-sitemap.xml/route.ts',
]
