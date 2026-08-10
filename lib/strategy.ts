import { black76, normalCDF } from '@/lib/black76'

export type Action     = 'BUY' | 'SELL'
export type OptionType = 'CE' | 'PE'

export interface Leg {
  strike:  number
  type:    OptionType | 'FUT'
  action:  Action
  qty:     number    // lots
  premium: number    // entry premium per unit (not per lot); for FUT, entry futures price
  iv:      number    // entry IV as decimal (e.g. 0.25 = 25%); unused for FUT, store 0
}

export interface SavedStrategy {
  id:           string
  instrument:   string
  expiry:       string
  legs:         Leg[]
  entryDate:    string   // ISO
  entryFutures: number
  label?:       string
}

export interface PayoffPoint {
  F:          number
  pnlExpiry:  number  // P&L at expiry (T = 0), intrinsic only
  pnlToday:   number  // P&L at current T using Black-76
}

export interface NetGreeks {
  delta: number
  gamma: number
  theta: number
  vega:  number
}

function sign(action: Action): 1 | -1 {
  return action === 'BUY' ? 1 : -1
}

function intrinsic(type: OptionType, F: number, K: number): number {
  return type === 'CE' ? Math.max(0, F - K) : Math.max(0, K - F)
}

export function computePayoff(
  legs:    Leg[],
  FRange:  number[],
  lotSize: number,
  T:       number,    // time to expiry in years (use 0 for expiry-only)
  r:       number,    // risk-free rate
  liveIV?: number,    // current ATM IV as % (e.g. 24.5); overrides leg.iv for "today" line
): PayoffPoint[] {
  const liveIvDecimal = liveIV != null && liveIV > 0 ? liveIV / 100 : undefined
  return FRange.map(F => {
    const pnlExpiry = legs.reduce((sum, leg) => {
      if (leg.type === 'FUT') {
        return sum + sign(leg.action) * leg.qty * lotSize * (F - leg.premium)
      }
      return sum + sign(leg.action) * leg.qty * lotSize * (intrinsic(leg.type, F, leg.strike) - leg.premium)
    }, 0)

    const pnlToday = T > 0
      ? legs.reduce((sum, leg) => {
          if (leg.type === 'FUT') {
            // Linear instrument — no time value, same P&L today as at expiry
            return sum + sign(leg.action) * leg.qty * lotSize * (F - leg.premium)
          }
          const ivToUse = liveIvDecimal ?? leg.iv
          // No usable IV from either source — black76's sigma<=0 guard would price this leg
          // at a flat zero regardless of days-to-expiry, collapsing "Today" to "100% lost"
          // even with real time value left. Fall back to intrinsic value instead — the same
          // honest treatment pnlExpiry already gives it.
          if (!(ivToUse > 0)) {
            return sum + sign(leg.action) * leg.qty * lotSize * (intrinsic(leg.type, F, leg.strike) - leg.premium)
          }
          const currentPrice = black76(F, leg.strike, T, r, ivToUse, leg.type).price
          return sum + sign(leg.action) * leg.qty * lotSize * (currentPrice - leg.premium)
        }, 0)
      : pnlExpiry

    return { F, pnlExpiry, pnlToday }
  })
}

export function computeNetGreeks(
  legs:    Leg[],
  F:       number,
  T:       number,
  r:       number,
  lotSize: number,
  liveIV?: number,   // current ATM IV as %; overrides a corrupted/unusable leg.iv, same as computePayoff
): NetGreeks {
  const liveIvDecimal = liveIV != null && liveIV > 0 ? liveIV / 100 : undefined
  return legs.reduce(
    (acc, leg) => {
      const s = sign(leg.action) * leg.qty * lotSize
      if (leg.type === 'FUT') {
        // Linear instrument — delta of 1 per unit, zero gamma/theta/vega
        return { ...acc, delta: acc.delta + s }
      }
      const ivToUse = liveIvDecimal ?? leg.iv
      // No usable IV from either source — contribute nothing rather than let black76
      // degenerate this leg's Greeks to a flat, misleading zero.
      if (!(ivToUse > 0)) return acc
      const g = black76(F, leg.strike, T, r, ivToUse, leg.type)
      return {
        delta: acc.delta + s * g.delta,
        gamma: acc.gamma + s * g.gamma,
        theta: acc.theta + s * g.theta,
        vega:  acc.vega  + s * g.vega,
      }
    },
    { delta: 0, gamma: 0, theta: 0, vega: 0 },
  )
}

export interface ExpectedMoveCone {
  sigmaT:   number             // annualized IV (decimal) × sqrt(T) — the log-return std dev to expiry
  oneSigma: [number, number]   // ~68% expected range
  twoSigma: [number, number]   // ~95% expected range
}

// Lognormal expected-move band around the current futures price — the same
// distributional assumption Black-76 (lib/black76.ts) already prices under,
// so this cone is internally consistent with the rest of the pricer rather
// than a naive linear F±sigma approximation.
export function computeExpectedMoveCone(
  futurePrice: number,
  ivPct: number,
  T: number,
): ExpectedMoveCone | null {
  if (!(futurePrice > 0) || !(ivPct > 0) || !(T > 0)) return null
  const sigmaT = (ivPct / 100) * Math.sqrt(T)
  const band = (z: number): [number, number] => [
    futurePrice * Math.exp(-z * sigmaT),
    futurePrice * Math.exp(z * sigmaT),
  ]
  return { sigmaT, oneSigma: band(1), twoSigma: band(2) }
}

export function computeBreakevens(payoff: PayoffPoint[]): number[] {
  const breakevens: number[] = []
  for (let i = 0; i < payoff.length - 1; i++) {
    const a = payoff[i], b = payoff[i + 1]
    if (a.pnlExpiry === 0) continue
    if (Math.sign(a.pnlExpiry) !== Math.sign(b.pnlExpiry)) {
      const t = -a.pnlExpiry / (b.pnlExpiry - a.pnlExpiry)
      breakevens.push(parseFloat((a.F + t * (b.F - a.F)).toFixed(2)))
    }
  }
  return breakevens
}

// Real probability of profit at expiry, weighted by the zero-drift lognormal
// distribution the site's own Black-76 pricer and expected-move cone already
// assume for F_T — not a naive count of sampled payoff points, which is both
// biased by buildFRange's non-uniform strike-clustered sampling density and,
// even on a uniform grid, implicitly (and wrongly) assumes F is uniformly
// distributed at expiry rather than lognormal.
export function computeProbOfProfit(
  payoff:      PayoffPoint[],
  breakevens:  number[],
  futurePrice: number,
  sigmaT:      number,
): number {
  if (payoff.length === 0) return 0
  if (!(sigmaT > 0) || !(futurePrice > 0)) {
    // Fallback when IV/T aren't available yet — naive fraction, better than nothing
    return payoff.filter(p => p.pnlExpiry >= 0).length / payoff.length
  }
  const sorted = [...breakevens].sort((a, b) => a - b)
  const bounds = [-Infinity, ...sorted, Infinity]
  const cdf = (F: number) =>
    F === -Infinity ? 0 : F === Infinity ? 1 : normalCDF(Math.log(F / futurePrice) / sigmaT)

  let profitProb = 0
  for (let i = 0; i < bounds.length - 1; i++) {
    const lo = bounds[i], hi = bounds[i + 1]
    const sampleF = lo === -Infinity ? payoff[0].F : hi === Infinity ? payoff[payoff.length - 1].F : (lo + hi) / 2
    const nearest = payoff.reduce((best, p) => Math.abs(p.F - sampleF) < Math.abs(best.F - sampleF) ? p : best, payoff[0])
    if (nearest.pnlExpiry >= 0) profitProb += cdf(hi) - cdf(lo)
  }
  return profitProb
}

export interface MaxProfitLoss {
  maxProfit: number | null  // null = unlimited
  maxLoss:   number | null  // null = unlimited
}

export function computeMaxProfitLoss(payoff: PayoffPoint[]): MaxProfitLoss {
  if (payoff.length < 5) return { maxProfit: null, maxLoss: null }

  const pnls = payoff.map(p => p.pnlExpiry)
  const max  = Math.max(...pnls)
  const min  = Math.min(...pnls)
  const n    = pnls.length
  const W    = 3  // consecutive-slope window

  // Slopes at upper boundary (positive = rising as F increases)
  const upSlopes   = Array.from({ length: W }, (_, i) => pnls[n - 1 - i] - pnls[n - 2 - i])
  // Slopes at lower boundary (positive = rising as F decreases)
  const downSlopes = Array.from({ length: W }, (_, i) => pnls[i] - pnls[i + 1])

  // Profit is unlimited if curve is still monotonically rising at either boundary
  const maxProfit = (upSlopes.every(s => s > 0) || downSlopes.every(s => s > 0)) ? null : max
  // Loss is unlimited if curve is still monotonically falling at either boundary
  const maxLoss   = (upSlopes.every(s => s < 0) || downSlopes.every(s => s < 0)) ? null : min

  return { maxProfit, maxLoss }
}

// Net cost of the strategy in points (positive = debit, negative = credit)
export function computeNetCost(legs: Leg[]): number {
  return legs.reduce((sum, leg) => sum + sign(leg.action) * leg.qty * leg.premium, 0)
}
