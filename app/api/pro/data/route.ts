import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { hasInternalAccess, isProUser } from '@/lib/subscription'
import { MCX_INSTRUMENTS } from '@/lib/options'
import { getPCRHistory } from '@/lib/pcrAnalysis'
import { getCorrelationMatrix } from '@/lib/correlation'
import { getTermStructureData } from '@/lib/terminalData'
import { getIVRankHistories } from '@/lib/ivRankHistory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Pro-only data for charts on ISR (shared, cached) pages. Those pages can't
// read the visitor's entitlement without going fully dynamic, so they render
// a synthetic blurred preview for everyone and a Pro browser fetches the
// real series from here. Never cached publicly — the answer depends on who
// is asking.
const NO_STORE = { 'Cache-Control': 'private, no-store' }

export async function GET(request: Request) {
  let pro = hasInternalAccess(request.headers)
  if (!pro) {
    const { userId } = await auth()
    // A failed check (Redis outage) is treated as not-Pro: 403, never 500.
    pro = await isProUser(userId).catch(() => false)
  }
  if (!pro) {
    return NextResponse.json({ error: 'Pro subscription required' }, { status: 403, headers: NO_STORE })
  }

  const { searchParams } = new URL(request.url)
  const kind = searchParams.get('kind')

  try {
    switch (kind) {
      case 'correlation':
        return NextResponse.json(getCorrelationMatrix(20), { headers: NO_STORE })

      case 'term-structure':
        return NextResponse.json(await getTermStructureData(), { headers: NO_STORE })

      case 'pcr-history': {
        const instrument = searchParams.get('instrument')?.toUpperCase()
        if (!instrument || !MCX_INSTRUMENTS[instrument]) {
          return NextResponse.json({ error: 'Invalid instrument' }, { status: 400, headers: NO_STORE })
        }
        return NextResponse.json({ instrument, history: await getPCRHistory(instrument) }, { headers: NO_STORE })
      }

      case 'iv-rank-history':
        return NextResponse.json({ instruments: await getIVRankHistories() }, { headers: NO_STORE })

      default:
        return NextResponse.json({ error: 'Unknown kind' }, { status: 400, headers: NO_STORE })
    }
  } catch (e) {
    console.error('[pro/data]', kind, (e as Error).message)
    return NextResponse.json({ error: 'Unavailable' }, { status: 502, headers: NO_STORE })
  }
}
