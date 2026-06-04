import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// EIA publishes weekly on Wednesdays — cache for 1 hour
export const revalidate = 3600

export interface EIAWeek {
  period:    string   // "2026-05-16"
  stocksM:   number   // total stocks in million barrels
  changeM:   number   // week-on-week change in million barrels
  direction: 'draw' | 'build'
}

export interface EIAData {
  period:        string   // "2026-05-16" (week ending date)
  changeM:       number   // change in million barrels (negative = draw)
  direction:     'draw' | 'build'
  isSignificant: boolean  // |change| > 1M bbls
  stocksM:       number   // total current stocks in million barrels
  history:       EIAWeek[] // last 8 weeks newest-first
  updatedAt:     string   // ISO timestamp of this fetch
}

export interface EIAError {
  error:      'no_key' | 'api_down' | 'no_data'
  updatedAt:  string
}

export type EIAResponse = EIAData | EIAError

// U.S. crude oil ending stocks (excl. SPR) — the number traders watch
// Series: petroleum/stoc/wstk, product EPC0 (crude oil), duoarea NUS (national), process SAE
const EIA_URL = 'https://api.eia.gov/v2/petroleum/stoc/wstk/data/'

export async function GET(): Promise<NextResponse<EIAResponse>> {
  const now = new Date().toISOString()
  const key = process.env.EIA_API_KEY

  if (!key) {
    return NextResponse.json({ error: 'no_key', updatedAt: now })
  }

  try {
    const params = new URLSearchParams({
      api_key:                  key,
      frequency:                'weekly',
      'data[0]':                'value',
      'facets[product][]':      'EPC0',  // crude oil
      'facets[duoarea][]':      'NUS',   // US national
      'facets[process][]':      'SAE',   // ending stocks, adj.
      'sort[0][column]':        'period',
      'sort[0][direction]':     'desc',
      offset:                   '0',
      length:                   '9',
    })

    const res = await fetch(`${EIA_URL}?${params}`, {
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.warn(`EIA API ${res.status}`)
      return NextResponse.json({ error: 'api_down', updatedAt: now })
    }

    const json = await res.json()
    const rows: Array<{ period: string; value: number }> = json?.response?.data ?? []

    if (rows.length < 2) {
      return NextResponse.json({ error: 'no_data', updatedAt: now })
    }

    const latest = rows[0]
    const prev   = rows[1]

    // values are in thousand barrels — convert to million
    const changeKb = latest.value - prev.value
    const changeM  = changeKb / 1000
    const stocksM  = latest.value / 1000

    // Build 8-week history (rows[0] is newest)
    const history: EIAWeek[] = rows.slice(0, 8).map((row, i) => {
      const next = rows[i + 1]
      const wChange = next ? (row.value - next.value) / 1000 : 0
      return {
        period:    row.period,
        stocksM:   parseFloat((row.value / 1000).toFixed(1)),
        changeM:   parseFloat(wChange.toFixed(2)),
        direction: wChange < 0 ? 'draw' : 'build',
      }
    })

    return NextResponse.json(
      {
        period:        latest.period,
        changeM:       parseFloat(changeM.toFixed(2)),
        direction:     changeM < 0 ? 'draw' : 'build',
        isSignificant: Math.abs(changeM) > 1,
        stocksM:       parseFloat(stocksM.toFixed(1)),
        history,
        updatedAt:     now,
      } satisfies EIAData,
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
        },
      }
    )
  } catch (err) {
    console.warn('EIA fetch failed:', (err as Error).message)
    return NextResponse.json({ error: 'api_down', updatedAt: now })
  }
}
