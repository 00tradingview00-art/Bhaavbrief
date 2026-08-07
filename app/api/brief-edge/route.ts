import { NextRequest } from 'next/server'
import { getAllBriefs, getBrief } from '@/lib/briefs'
import { parseBriefSections } from '@/lib/parseBriefSections'
import { loadSnapshot } from '@/lib/snapshot'
import { resolveEdge } from '@/scripts/lib/edgeLedger.mjs'

// LIVE (0) — the brief prose itself only changes once a day (and getBrief/
// getAllBriefs already have their own 60s cache), but the `resolution`
// field below is derived from the live market snapshot and must never
// serve a stale confirmed/rejected verdict.
export const dynamic    = 'force-dynamic'
export const revalidate = 0

const INSTRUMENT_TO_COMMODITIES: Record<string, string[]> = {
  GOLD:       ['MCX Gold'],
  SILVER:     ['MCX Silver'],
  CRUDEOIL:   ['MCX Crude'],
  COPPER:     ['MCX Copper'],
  NATURALGAS: ['MCX Natural Gas', 'MCX NatGas'],
}

export async function GET(req: NextRequest) {
  const commodity = req.nextUrl.searchParams.get('commodity')?.toUpperCase()
  const labels = commodity ? INSTRUMENT_TO_COMMODITIES[commodity] : null
  if (!labels) return Response.json({ edge: null })

  const briefs = await getAllBriefs()
  const meta = briefs.find(b => labels.some(l => b.commodities.includes(l)))
  if (!meta) return Response.json({ edge: null })

  const brief = getBrief(meta.slug)
  if (!brief) return Response.json({ edge: null })

  const parsed = parseBriefSections(brief.content)

  // Live resolution of TODAY's own structured edge (edgeMetric/edgeLevel/
  // edgeCondition), reusing the same deterministic resolveEdge() the
  // pipeline already uses to grade the PRIOR day's edge each morning —
  // works unchanged here since it just compares a level against a live
  // snapshot price. Degrades to null (never fabricates) when the edition
  // has no structured edge or no snapshot is available.
  const snapshot = loadSnapshot()
  const resolution = snapshot && brief.edgeMetric
    ? resolveEdge({
        edgeMetric:    brief.edgeMetric,
        edgeLevel:     brief.edgeLevel     ?? undefined,
        edgeCondition: brief.edgeCondition ?? undefined,
      }, snapshot)
    : null

  return Response.json({
    edge:     parsed?.edgeOfDay ?? null,
    tomorrow: parsed?.tomorrow  ?? null,
    title:    brief.title,
    urlSlug:  brief.urlSlug,
    date:     brief.displayDate,
    edgeMetric:    brief.edgeMetric,
    edgeLevel:     brief.edgeLevel,
    edgeCondition: brief.edgeCondition,
    resolution,
  })
}
