#!/usr/bin/env node
/**
 * scripts/check-route-manifest.mjs — P-02 route manifest CI check.
 * See config/routes.mjs for the rule.
 *
 * Usage: node scripts/check-route-manifest.mjs
 * Exit:  0 = manifest matches actual routes, 1 = drift found
 */
import path from 'node:path'
import { ROUTES } from '../config/routes.mjs'
import { walkRouteFiles, fileToRoute } from './lib/routeWalk.mjs'

const APP_DIR = path.join(process.cwd(), 'app')

function main() {
  const actualRoutes = new Set(walkRouteFiles(APP_DIR).map((f) => fileToRoute(APP_DIR, f)))
  const manifestRoutes = new Set(ROUTES)

  const missingFromManifest = [...actualRoutes].filter((r) => !manifestRoutes.has(r)).sort()
  const orphanedInManifest = [...manifestRoutes].filter((r) => !actualRoutes.has(r)).sort()

  if (missingFromManifest.length === 0 && orphanedInManifest.length === 0) {
    console.log(`P-02 route manifest: ${actualRoutes.size} routes, matches config/routes.mjs exactly.`)
    process.exit(0)
  }

  console.error('P-02 route manifest: drift detected between app/ and config/routes.mjs\n')
  if (missingFromManifest.length > 0) {
    console.error(`Routes that exist in app/ but are missing from config/routes.mjs (add them):`)
    for (const r of missingFromManifest) console.error(`  + ${r}`)
  }
  if (orphanedInManifest.length > 0) {
    console.error(`Routes listed in config/routes.mjs with no matching app/ file (remove them — orphaned prerender risk):`)
    for (const r of orphanedInManifest) console.error(`  - ${r}`)
  }
  process.exit(1)
}

main()
