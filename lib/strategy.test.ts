import { describe, test, expect } from 'vitest'
import {
  computePayoff,
  computeNetGreeks,
  computeBreakevens,
  computeMaxProfitLoss,
  computeNetCost,
  type Leg,
} from './strategy'

// 101-point range — odd count ensures the exact center (ATM) is always a grid point
const range = (center: number, width = 0.15, points = 101): number[] =>
  Array.from({ length: points }, (_, i) => center * (1 - width) + (i / (points - 1)) * center * 2 * width)

const LOT  = 100  // Gold lot size
const F    = 90000 // spot futures price
const T    = 30 / 365
const R    = 0.065
const IV   = 0.20 // 20%

describe('computePayoff — at-expiry (T = 0)', () => {
  test('long call: below strike → loss = premium; above strike → profit rises', () => {
    const legs: Leg[] = [{ strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: IV }]
    const payoff = computePayoff(legs, range(F), LOT, 0, R)

    const atStrike = payoff.find(p => Math.abs(p.F - F) < F * 0.002)!
    // At ATM, intrinsic = 0, so pnl ≈ -premium * lotSize
    expect(atStrike.pnlExpiry).toBeCloseTo(-500 * LOT, -2)

    const deepITM = payoff[payoff.length - 1]
    expect(deepITM.pnlExpiry).toBeGreaterThan(0)
  })

  test('short call: below strike → profit = premium; above strike → loss grows', () => {
    const legs: Leg[] = [{ strike: F, type: 'CE', action: 'SELL', qty: 1, premium: 500, iv: IV }]
    const payoff = computePayoff(legs, range(F), LOT, 0, R)

    const atStrike = payoff.find(p => Math.abs(p.F - F) < F * 0.002)!
    expect(atStrike.pnlExpiry).toBeCloseTo(500 * LOT, -2)

    const deepITM = payoff[payoff.length - 1]
    expect(deepITM.pnlExpiry).toBeLessThan(0)
  })

  test('straddle: V-shape — loss is greatest at ATM, profits on large moves', () => {
    const prem = 500
    const legs: Leg[] = [
      { strike: F, type: 'CE', action: 'BUY', qty: 1, premium: prem, iv: IV },
      { strike: F, type: 'PE', action: 'BUY', qty: 1, premium: prem, iv: IV },
    ]
    const payoff = computePayoff(legs, range(F), LOT, 0, R)

    // Max loss is at ATM
    const atStrike = payoff.find(p => Math.abs(p.F - F) < F * 0.002)!
    expect(atStrike.pnlExpiry).toBeCloseTo(-prem * 2 * LOT, -2)

    // Both wings should be profitable
    expect(payoff[0].pnlExpiry).toBeGreaterThan(0)
    expect(payoff[payoff.length - 1].pnlExpiry).toBeGreaterThan(0)
  })

  test('bull call spread: profit capped at spread width minus net debit', () => {
    const K1 = F, K2 = F * 1.03
    const debit = 300  // net premium paid
    const legs: Leg[] = [
      { strike: K1, type: 'CE', action: 'BUY',  qty: 1, premium: 500, iv: IV },
      { strike: K2, type: 'CE', action: 'SELL', qty: 1, premium: 200, iv: IV },
    ]
    const payoff = computePayoff(legs, range(F, 0.08), LOT, 0, R)

    const deepITM  = payoff[payoff.length - 1]
    const deepOTM  = payoff[0]
    const maxPnl   = deepITM.pnlExpiry

    expect(deepOTM.pnlExpiry).toBeCloseTo(-debit * LOT, -2)
    expect(maxPnl).toBeCloseTo((K2 - K1 - debit) * LOT, -2)
    // Profit doesn't grow past the short strike
    expect(maxPnl).toBeGreaterThan(0)
  })

  test('iron condor: profit zone in middle, losses on wings', () => {
    const sellCE = F * 1.03, buyCE = F * 1.06
    const sellPE = F * 0.97, buyPE = F * 0.94
    const legs: Leg[] = [
      { strike: sellCE, type: 'CE', action: 'SELL', qty: 1, premium: 300, iv: IV },
      { strike: buyCE,  type: 'CE', action: 'BUY',  qty: 1, premium: 100, iv: IV },
      { strike: sellPE, type: 'PE', action: 'SELL', qty: 1, premium: 280, iv: IV },
      { strike: buyPE,  type: 'PE', action: 'BUY',  qty: 1, premium: 80,  iv: IV },
    ]
    const payoff = computePayoff(legs, range(F, 0.10), LOT, 0, R)

    const atATM = payoff.find(p => Math.abs(p.F - F) < F * 0.005)!
    expect(atATM.pnlExpiry).toBeGreaterThan(0)

    expect(payoff[0].pnlExpiry).toBeLessThan(0)
    expect(payoff[payoff.length - 1].pnlExpiry).toBeLessThan(0)
  })
})

describe('computeBreakevens', () => {
  test('long straddle has two breakevens', () => {
    const prem = 500
    const legs: Leg[] = [
      { strike: F, type: 'CE', action: 'BUY', qty: 1, premium: prem, iv: IV },
      { strike: F, type: 'PE', action: 'BUY', qty: 1, premium: prem, iv: IV },
    ]
    const payoff = computePayoff(legs, range(F, 0.12, 200), LOT, 0, R)
    const bes = computeBreakevens(payoff)
    expect(bes.length).toBe(2)
    // Upper breakeven ≈ strike + 2*prem, lower ≈ strike - 2*prem
    expect(bes[0]).toBeCloseTo(F - prem * 2, -2)
    expect(bes[1]).toBeCloseTo(F + prem * 2, -2)
  })

  test('long call has one breakeven', () => {
    const legs: Leg[] = [{ strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: IV }]
    const payoff = computePayoff(legs, range(F, 0.12, 200), LOT, 0, R)
    const bes = computeBreakevens(payoff)
    expect(bes.length).toBe(1)
    expect(bes[0]).toBeCloseTo(F + 500, -2)
  })
})

describe('computeMaxProfitLoss', () => {
  test('long call: max loss is finite (premium paid), max profit is unlimited', () => {
    const legs: Leg[] = [{ strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: IV }]
    const payoff = computePayoff(legs, range(F, 0.15, 200), LOT, 0, R)
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoff)
    expect(maxProfit).toBeNull()                 // unlimited upside
    expect(maxLoss).toBeCloseTo(-500 * LOT, -4)  // limited to premium paid
  })

  test('bull call spread: both profit and loss are finite', () => {
    const legs: Leg[] = [
      { strike: F,          type: 'CE', action: 'BUY',  qty: 1, premium: 500, iv: IV },
      { strike: F * 1.03,   type: 'CE', action: 'SELL', qty: 1, premium: 200, iv: IV },
    ]
    const payoff = computePayoff(legs, range(F, 0.06, 200), LOT, 0, R)
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoff)
    // Both should be finite (the spread caps both sides)
    expect(typeof maxProfit).toBe('number')
    expect(typeof maxLoss).toBe('number')
    expect((maxProfit as number)).toBeGreaterThan(0)
    expect((maxLoss as number)).toBeLessThan(0)
  })
})

describe('computeNetGreeks', () => {
  test('delta-neutral straddle: net delta near zero at ATM', () => {
    const legs: Leg[] = [
      { strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: IV },
      { strike: F, type: 'PE', action: 'BUY', qty: 1, premium: 500, iv: IV },
    ]
    const g = computeNetGreeks(legs, F, T, R, LOT)
    expect(Math.abs(g.delta)).toBeLessThan(LOT * 0.05)
  })

  test('net vega of long straddle is positive (long vol)', () => {
    const legs: Leg[] = [
      { strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: IV },
      { strike: F, type: 'PE', action: 'BUY', qty: 1, premium: 500, iv: IV },
    ]
    const g = computeNetGreeks(legs, F, T, R, LOT)
    expect(g.vega).toBeGreaterThan(0)
  })

  test('selling a straddle gives negative vega', () => {
    const legs: Leg[] = [
      { strike: F, type: 'CE', action: 'SELL', qty: 1, premium: 500, iv: IV },
      { strike: F, type: 'PE', action: 'SELL', qty: 1, premium: 500, iv: IV },
    ]
    const g = computeNetGreeks(legs, F, T, R, LOT)
    expect(g.vega).toBeLessThan(0)
  })
})

describe('computeNetCost', () => {
  test('debit spread: net cost is positive', () => {
    const legs: Leg[] = [
      { strike: F, type: 'CE', action: 'BUY',  qty: 1, premium: 500, iv: IV },
      { strike: F, type: 'CE', action: 'SELL', qty: 1, premium: 200, iv: IV },
    ]
    expect(computeNetCost(legs)).toBeCloseTo(300)
  })

  test('credit spread: net cost is negative', () => {
    const legs: Leg[] = [
      { strike: F, type: 'CE', action: 'SELL', qty: 1, premium: 500, iv: IV },
      { strike: F, type: 'CE', action: 'BUY',  qty: 1, premium: 200, iv: IV },
    ]
    expect(computeNetCost(legs)).toBeCloseTo(-300)
  })
})
