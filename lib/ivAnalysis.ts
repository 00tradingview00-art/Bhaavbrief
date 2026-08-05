export interface IVHistoryPoint {
  date: string
  iv: number  // percentage, e.g. 24.5
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

  const labels: Record<typeof regime, string> = {
    CHEAP:  `Cheap — ${percentile}th percentile of past ${ivValues.length} days`,
    NORMAL: `Normal — ${percentile}th percentile of past ${ivValues.length} days`,
    RICH:   `Rich — ${percentile}th percentile of past ${ivValues.length} days`,
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
