import { NextRequest } from 'next/server'
import { getEventsForCommodity } from '@/lib/eventMap'

export const revalidate = 1800  // 30 min — event-map.json changes rarely

const INSTRUMENT_TO_EVENT_KEY: Record<string, string> = {
  GOLD:       'gold',
  SILVER:     'silver',
  CRUDEOIL:   'crude',
  COPPER:     'copper',
  NATURALGAS: 'natgas',
}

export async function GET(req: NextRequest) {
  const instrument = req.nextUrl.searchParams.get('instrument')?.toUpperCase()
  const key = instrument ? INSTRUMENT_TO_EVENT_KEY[instrument] : null
  if (!key) return Response.json({ events: [] })
  return Response.json({ events: getEventsForCommodity(key) })
}
