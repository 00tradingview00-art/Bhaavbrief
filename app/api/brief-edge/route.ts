import { NextRequest } from 'next/server'
import { getAllBriefs, getBrief } from '@/lib/briefs'
import { parseBriefSections } from '@/lib/parseBriefSections'

export const revalidate = 1800  // 30 min — brief content changes once per day

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
  return Response.json({
    edge:     parsed?.edgeOfDay ?? null,
    tomorrow: parsed?.tomorrow  ?? null,
    title:    brief.title,
    urlSlug:  brief.urlSlug,
    date:     brief.displayDate,
  })
}
