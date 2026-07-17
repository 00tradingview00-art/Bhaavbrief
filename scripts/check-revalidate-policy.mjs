#!/usr/bin/env node
/**
 * scripts/check-revalidate-policy.mjs — P-03 ISR policy CI check.
 * See config/revalidate.mjs for the full rule and why it can't be enforced
 * via a shared import inside app/ itself.
 *
 * Usage: node scripts/check-revalidate-policy.mjs
 * Exit:  0 = compliant, 1 = one or more violations printed
 */
import fs from 'node:fs'
import path from 'node:path'
import { REVALIDATE, LIVE_DATA_IMPORT_MARKERS, LIVE_DATA_EXEMPT } from '../config/revalidate.mjs'
import { walkRouteFiles } from './lib/routeWalk.mjs'

const ALLOWED_VALUES = new Set(Object.values(REVALIDATE))
const APP_DIR = path.join(process.cwd(), 'app')

function relPath(full) {
  return path.relative(process.cwd(), full)
}

function main() {
  const files = walkRouteFiles(APP_DIR)
  const violations = []

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8')
    const rel = relPath(file)

    const revalidateMatch = src.match(/export const revalidate\s*=\s*(-?\d+)/)
    const hasForceDynamic = /export const dynamic\s*=\s*['"]force-dynamic['"]/.test(src)
    const hasForceStatic = /export const dynamic\s*=\s*['"]force-static['"]/.test(src)

    if (revalidateMatch) {
      const value = parseInt(revalidateMatch[1], 10)
      if (!ALLOWED_VALUES.has(value)) {
        violations.push(`${rel}: revalidate = ${value} is not one of the blessed values in config/revalidate.mjs (${[...ALLOWED_VALUES].join(', ')})`)
      }
    }

    // route.ts files with only POST/PUT/DELETE (no GET) aren't cacheable
    // pages at all — Next executes them per-request regardless of
    // revalidate, so the ISR policy doesn't apply to them.
    const isRouteFile = file.endsWith('route.ts')
    const hasGetHandler = !isRouteFile || /export\s+(async\s+)?function\s+GET\b|export\s+const\s+GET\b/.test(src)

    // Content-detail pages (one static param per published item, e.g.
    // /briefs/[slug], /arcs/[id]) are immutable once published — a
    // correction is an explicit editorial event (R-05), not staleness — so
    // the strict 15-min ceiling only applies to listing/dashboard pages.
    const isContentDetailPage = /generateStaticParams/.test(src)

    const importsLiveData = LIVE_DATA_IMPORT_MARKERS.some((marker) => src.includes(marker))
    const isExempt = LIVE_DATA_EXEMPT.includes(rel)

    if (importsLiveData && !isExempt && hasGetHandler && !revalidateMatch && !hasForceDynamic) {
      if (hasForceStatic) {
        violations.push(`${rel}: imports live/intra-day data but declares dynamic = 'force-static' — data will never refresh without a redeploy`)
      } else {
        violations.push(`${rel}: imports live/intra-day data (${LIVE_DATA_IMPORT_MARKERS.filter((m) => src.includes(m)).join(', ')}) but has no revalidate or dynamic export — default-SSG, will only refresh on redeploy (the D-01 failure mode)`)
      }
    } else if (importsLiveData && !isExempt && revalidateMatch && !isContentDetailPage) {
      const value = parseInt(revalidateMatch[1], 10)
      if (value > REVALIDATE.MEDIUM) {
        violations.push(`${rel}: imports live/intra-day data but revalidate = ${value}s exceeds the ${REVALIDATE.MEDIUM}s (15 min) ceiling for listing/dashboard routes`)
      }
    }
  }

  if (violations.length > 0) {
    console.error(`P-03 ISR policy: ${violations.length} violation(s):\n`)
    for (const v of violations) console.error(` - ${v}`)
    process.exit(1)
  }
  console.log(`P-03 ISR policy: ${files.length} route files checked, all compliant.`)
  process.exit(0)
}

main()
