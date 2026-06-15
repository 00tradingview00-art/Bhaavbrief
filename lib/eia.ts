/**
 * lib/eia.ts — server-side EIA crude inventory fetch
 *
 * Called from the homepage (SSR) so the EIACard renders without a loading flash.
 * The /api/eia route uses the same logic for client-side refreshes.
 */

export interface EIAWeek {
  period:    string
  stocksM:   number
  changeM:   number
  direction: 'draw' | 'build'
}

export interface EIAData {
  period:        string
  changeM:       number
  direction:     'draw' | 'build'
  isSignificant: boolean
  stocksM:       number
  history:       EIAWeek[]
  updatedAt:     string
}

export interface EIAError {
  error:     'no_key' | 'api_down' | 'no_data'
  updatedAt: string
}

export type EIAResponse = EIAData | EIAError

export function isEIAData(r: EIAResponse | null): r is EIAData {
  return r !== null && !('error' in r)
}

const EIA_URL = 'https://api.eia.gov/v2/petroleum/stoc/wstk/data/'

export async function loadEIA(): Promise<EIAResponse> {
  const now = new Date().toISOString()
  const key = process.env.EIA_API_KEY
  if (!key) return { error: 'no_key', updatedAt: now }

  try {
    const params = new URLSearchParams({
      api_key:               key,
      frequency:             'weekly',
      'data[0]':             'value',
      'facets[product][]':   'EPC0',
      'facets[duoarea][]':   'NUS',
      'facets[process][]':   'SAE',
      'sort[0][column]':     'period',
      'sort[0][direction]':  'desc',
      offset:                '0',
      length:                '9',
    })

    const res = await fetch(`${EIA_URL}?${params}`, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    })

    if (!res.ok) return { error: 'api_down', updatedAt: now }

    const json = await res.json()
    const rows: Array<{ period: string; value: number }> = json?.response?.data ?? []
    if (rows.length < 2) return { error: 'no_data', updatedAt: now }

    const changeKb = rows[0].value - rows[1].value
    const changeM  = changeKb / 1000
    const stocksM  = rows[0].value / 1000

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

    return {
      period:        rows[0].period,
      changeM:       parseFloat(changeM.toFixed(2)),
      direction:     changeM < 0 ? 'draw' : 'build',
      isSignificant: Math.abs(changeM) > 1,
      stocksM:       parseFloat(stocksM.toFixed(1)),
      history,
      updatedAt:     now,
    }
  } catch {
    return { error: 'api_down', updatedAt: now }
  }
}
