export interface IVHistoryPoint {
  date: string
  iv: number  // percentage, e.g. 24.5
}

interface LiveIVChainRow {
  strike: number
  isATM?: boolean
  CE: { iv: number | null; tier: string }
  PE: { iv: number | null; tier: string }
}

export interface LiveATMIV {
  iv: number | null
  atStrike: number | null
  isExactATM: boolean
}

// Single shared source of "current IV right now" for a chain — was previously
// hand-written independently in components/mcx/OptionChain.tsx and, separately,
// approximated in app/tools/mcx-iv-rank/page.tsx by reusing the last *stored
// daily snapshot* instead of a live value. Those two notions of "now" could
// diverge by hours, producing contradictory IV Rank/percentile for the same
// instrument on two different pages (confirmed live: Gold showed IV Rank 60
// on one page, 28 on the other, at the same moment).
//
// LIVE-tier only, never averaged with STALE/JUNK: a STALE side still gets a
// Black-76 IV computed from a stale/thin price and can be wildly wrong —
// averaging one in unfiltered dragged this number off by tens of points on a
// real case (2026-07-21, Silver: a clean 37% LIVE call averaged with a stale
// ~95% put read as "66% today"). The ATM strike itself is sometimes the
// illiquid one while strikes one or two away trade fine (2026-08-18: Gold/
// Crude ATM strikes both non-LIVE while iVIX, which pools across many
// strikes, read normally) — so this walks outward from the ATM row and uses
// the nearest strike that has a LIVE-tier side, never averaging non-LIVE data.
export function liveAtmIV(chain: LiveIVChainRow[]): LiveATMIV {
  const atmIdx = chain.findIndex(r => r.isATM)
  if (atmIdx === -1) return { iv: null, atStrike: null, isExactATM: false }

  const order = chain.map((_, i) => i).sort((a, b) => Math.abs(a - atmIdx) - Math.abs(b - atmIdx))
  for (const idx of order) {
    const row = chain[idx]
    const ivs = [row.CE, row.PE]
      .filter(side => side.tier === 'LIVE' && side.iv != null && side.iv > 0)
      .map(side => side.iv as number)
    if (ivs.length) {
      const iv = parseFloat((ivs.reduce((s, v) => s + v, 0) / ivs.length).toFixed(2))
      return { iv, atStrike: row.strike, isExactATM: row.strike === chain[atmIdx].strike }
    }
  }
  return { iv: null, atStrike: null, isExactATM: false }
}

export interface IVRegime {
  currentIV: number
  percentile: number   // 0–100: what % of historical days had lower IV
  ivRank: number       // 0–100: (current − min) / (max − min) × 100
  regime: 'CHEAP' | 'NORMAL' | 'RICH'
  label: string
}

// Thresholds: < 25th pct = CHEAP (favour buying), > 75th = RICH (favour selling)
const CHEAP_THRESHOLD = 25
const RICH_THRESHOLD  = 75

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:  return `${n}st`
    case 2:  return `${n}nd`
    case 3:  return `${n}rd`
    default: return `${n}th`
  }
}

export function computeIVRegime(history: IVHistoryPoint[], currentIV: number): IVRegime {
  if (history.length === 0) {
    return { currentIV, percentile: 50, ivRank: 50, regime: 'NORMAL', label: 'Insufficient history' }
  }

  const ivValues = history.map(h => h.iv)
  const min = Math.min(...ivValues)
  const max = Math.max(...ivValues)

  const below = ivValues.filter(iv => iv < currentIV).length
  const percentile = Math.round((below / ivValues.length) * 100)

  // clamp to [0,100]: currentIV may exceed historical max (or be below min)
  const ivRank = max > min
    ? Math.round(Math.min(100, Math.max(0, ((currentIV - min) / (max - min)) * 100)))
    : 50

  const regime: 'CHEAP' | 'NORMAL' | 'RICH' =
    percentile < CHEAP_THRESHOLD ? 'CHEAP' :
    percentile > RICH_THRESHOLD  ? 'RICH'  :
    'NORMAL'

  const pctLabel = ordinal(percentile)
  const labels: Record<typeof regime, string> = {
    CHEAP:  `Cheap — ${pctLabel} percentile of past ${ivValues.length} days`,
    NORMAL: `Normal — ${pctLabel} percentile of past ${ivValues.length} days`,
    RICH:   `Rich — ${pctLabel} percentile of past ${ivValues.length} days`,
  }

  return { currentIV, percentile, ivRank, regime, label: labels[regime] }
}

export type MarketView = 'BULLISH' | 'NEUTRAL' | 'BEARISH'

export type TemplateId =
  | 'ATM_STRADDLE'
  | 'OTM_STRANGLE'
  | 'LONG_CALL'
  | 'LONG_PUT'
  | 'BULL_CALL_SPREAD'
  | 'BEAR_PUT_SPREAD'
  | 'IRON_CONDOR'
  | 'BULL_PUT_SPREAD'
  | 'BEAR_CALL_SPREAD'
  | 'COVERED_CALL'
  | 'PROTECTIVE_PUT'
  | 'COLLAR'

export interface StrategyTemplate {
  name: string
  description: string
  templateId: TemplateId
}

const MATRIX: Record<'CHEAP' | 'NORMAL' | 'RICH', Record<MarketView, StrategyTemplate[]>> = {
  CHEAP: {
    NEUTRAL: [
      { name: 'Long Straddle',    description: 'Buy ATM CE + ATM PE — profits from a large move either way',         templateId: 'ATM_STRADDLE'    },
      { name: 'Long Strangle',    description: 'Buy OTM CE + OTM PE — cheaper than straddle, needs bigger move',     templateId: 'OTM_STRANGLE'    },
    ],
    BULLISH: [
      { name: 'Bull Call Spread', description: 'Buy ATM CE, Sell OTM CE — limited cost, capped upside',              templateId: 'BULL_CALL_SPREAD' },
      { name: 'Long Call',        description: 'Buy ATM CE — directional bet with defined maximum risk',              templateId: 'LONG_CALL'        },
    ],
    BEARISH: [
      { name: 'Bear Put Spread',  description: 'Buy ATM PE, Sell OTM PE — limited cost, capped downside capture',    templateId: 'BEAR_PUT_SPREAD'  },
      { name: 'Long Put',         description: 'Buy ATM PE — directional bet with defined maximum risk',              templateId: 'LONG_PUT'         },
    ],
  },
  RICH: {
    NEUTRAL: [
      { name: 'Iron Condor',      description: 'Sell OTM CE + OTM PE, Buy wings — collect premium in a range',      templateId: 'IRON_CONDOR'      },
    ],
    BULLISH: [
      { name: 'Bull Put Spread',  description: 'Sell OTM PE, Buy further OTM PE — collect premium, bullish bias',   templateId: 'BULL_PUT_SPREAD'  },
    ],
    BEARISH: [
      { name: 'Bear Call Spread', description: 'Sell OTM CE, Buy further OTM CE — collect premium, bearish bias',   templateId: 'BEAR_CALL_SPREAD' },
    ],
  },
  NORMAL: {
    NEUTRAL: [
      { name: 'Iron Condor',      description: 'Sell OTM strangles with wings — range-bound premium collection',     templateId: 'IRON_CONDOR'      },
    ],
    BULLISH: [
      { name: 'Bull Call Spread', description: 'Buy ATM CE, Sell OTM CE — defined risk directional play',            templateId: 'BULL_CALL_SPREAD' },
    ],
    BEARISH: [
      { name: 'Bear Put Spread',  description: 'Buy ATM PE, Sell OTM PE — defined risk directional play',            templateId: 'BEAR_PUT_SPREAD'  },
    ],
  },
}

export function recommendStrategies(
  regime: 'CHEAP' | 'NORMAL' | 'RICH',
  marketView: MarketView,
): StrategyTemplate[] {
  return MATRIX[regime][marketView] ?? []
}
