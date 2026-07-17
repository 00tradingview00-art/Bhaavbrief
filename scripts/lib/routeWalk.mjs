/**
 * scripts/lib/routeWalk.mjs — shared app/ router-file enumeration, used by
 * both check-revalidate-policy.mjs (P-03) and check-route-manifest.mjs
 * (P-02) so the two checks can't silently drift apart on what counts as a
 * "route file."
 */
import fs from 'node:fs'
import path from 'node:path'

/** Recursively find every page.tsx/route.ts under `dir`. Returns absolute paths. */
export function walkRouteFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkRouteFiles(full, out)
    else if (entry.name === 'page.tsx' || entry.name === 'route.ts') out.push(full)
  }
  return out
}

/**
 * Converts an absolute app/ file path into a URL-shaped route pattern, e.g.
 * `.../app/briefs/[slug]/page.tsx` -> `/briefs/[slug]`, `.../app/page.tsx` -> `/`.
 * No route groups exist in this repo (verified — no `(name)` directories
 * under app/), so this doesn't need to strip them; if one is ever added,
 * this function needs an update alongside it.
 */
export function fileToRoute(appDir, filePath) {
  const rel = path.relative(appDir, filePath)
  const withoutFile = rel.replace(/\/(page\.tsx|route\.ts)$/, '').replace(/^(page\.tsx|route\.ts)$/, '')
  return withoutFile === '' ? '/' : `/${withoutFile}`
}
