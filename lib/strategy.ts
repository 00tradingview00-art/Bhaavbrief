import { black76 } from '@/lib/black76'

export type Action     = 'BUY' | 'SELL'
export type OptionType = 'CE' | 'PE'

export interface Leg {
  strike:  number
  type:    OptionType
  action:  Action
  qty:     number    // lots
  premium: number    // entry premium per unit (not per lot)
  iv:      number    // entry IV as decimal (e.g. 0.25 = 25%)
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
  T:       number,   // time to expiry in years (use 0 for expiry-only)
  r:       number,   // risk-free rate
): PayoffPoint[] {
  return FRange.map(F => {
    const pnlExpiry = legs.reduce((sum, leg) => {
      return sum + sign(leg.action) * leg.qty * lotSize * (intrinsic(leg.type, F, leg.strike) - leg.premium)
    }, 0)

    const pnlToday = T > 0
      ? legs.reduce((sum, leg) => {
          const currentPrice = black76(F, leg.strike, T, r, leg.iv, leg.type).price
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
): NetGreeks {
  return legs.reduce(
    (acc, leg) => {
      const g = black76(F, leg.strike, T, r, leg.iv, leg.type)
      const s = sign(leg.action) * leg.qty * lotSize
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
