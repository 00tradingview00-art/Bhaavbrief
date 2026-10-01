// Cache-Control for /api/options responses.
//
// Only a free response to a request with no session at all is identical for
// every visitor and safe to share-cache at the edge. Signed-in visitors (free
// or Pro) and internal callers stay private. A request that carries a
// session cookie Clerk didn't accept (expired/garbage) is private too:
// middleware.ts routes every session-cookie request to its own cache key,
// and a public response there would be served to real Pro users.
export function chainCacheControl(v: { pro: boolean; signedIn: boolean; hasSessionCookie: boolean }): string {
  return !v.pro && !v.signedIn && !v.hasSessionCookie
    ? 'public, s-maxage=30, stale-while-revalidate=10'
    : 'private, no-store'
}
