import { describe, test, expect } from 'vitest'
import {
  computePayoff,
  computeNetGreeks,
  computeBreakevens,
  computeMaxProfitLoss,
  computeNetCost,
  computeExpectedMoveCone,
  computeProbOfProfit,
  type Leg,
} from './strategy'
import { normalCDF } from './black76'

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

describe('computePayoff — futures leg', () => {
  test('long futures: linear payoff, no premium/time-value component', () => {
    const legs: Leg[] = [{ strike: F, type: 'FUT', action: 'BUY', qty: 1, premium: F, iv: 0 }]
    const payoff = computePayoff(legs, range(F), LOT, 0, R)

    const atEntry = payoff.find(p => Math.abs(p.F - F) < F * 0.002)!
    expect(atEntry.pnlExpiry).toBeCloseTo(0, -2)

    const up = payoff[payoff.length - 1]
    const down = payoff[0]
    expect(up.pnlExpiry).toBeCloseTo((up.F - F) * LOT, -2)
    expect(down.pnlExpiry).toBeCloseTo((down.F - F) * LOT, -2)
  })

  test('short futures: payoff is the mirror image of long futures', () => {
    const long: Leg[]  = [{ strike: F, type: 'FUT', action: 'BUY',  qty: 1, premium: F, iv: 0 }]
    const short: Leg[] = [{ strike: F, type: 'FUT', action: 'SELL', qty: 1, premium: F, iv: 0 }]
    const payoffLong  = computePayoff(long, range(F), LOT, 0, R)
    const payoffShort = computePayoff(short, range(F), LOT, 0, R)

    payoffLong.forEach((p, i) => {
      expect(payoffShort[i].pnlExpiry).toBeCloseTo(-p.pnlExpiry, -2)
    })
  })

  test('a futures leg has no time value: pnlToday equals pnlExpiry', () => {
    const legs: Leg[] = [{ strike: F, type: 'FUT', action: 'BUY', qty: 1, premium: F, iv: 0 }]
    const payoff = computePayoff(legs, range(F), LOT, T, R)
    payoff.forEach(p => expect(p.pnlToday).toBeCloseTo(p.pnlExpiry, -2))
  })

  test('covered call: capped upside, uncapped downside (minus the credit received)', () => {
    const callStrike = F * 1.03
    const premium = 500
    const legs: Leg[] = [
      { strike: F, type: 'FUT', action: 'BUY',  qty: 1, premium: F, iv: 0 },
      { strike: callStrike, type: 'CE', action: 'SELL', qty: 1, premium, iv: IV },
    ]
    const payoff = computePayoff(legs, range(F, 0.10), LOT, 0, R)
    const deepITM = payoff[payoff.length - 1]
    const deepOTM = payoff[0]

    // Upside is capped at (callStrike - F + premium) * lot
    expect(deepITM.pnlExpiry).toBeCloseTo((callStrike - F + premium) * LOT, -1)
    // Downside keeps falling with the futures leg (only cushioned by the premium)
    expect(deepOTM.pnlExpiry).toBeCloseTo((deepOTM.F - F + premium) * LOT, -1)
  })

  test('protective put: floored downside, uncapped upside (minus the debit paid)', () => {
    const putStrike = F * 0.97
    const premium = 500
    const legs: Leg[] = [
      { strike: F, type: 'FUT', action: 'BUY', qty: 1, premium: F, iv: 0 },
      { strike: putStrike, type: 'PE', action: 'BUY', qty: 1, premium, iv: IV },
    ]
    const payoff = computePayoff(legs, range(F, 0.10), LOT, 0, R)
    const deepITM = payoff[payoff.length - 1]
    const deepOTM = payoff[0]

    // Downside is floored at (putStrike - F - premium) * lot
    expect(deepOTM.pnlExpiry).toBeCloseTo((putStrike - F - premium) * LOT, -1)
    // Upside keeps rising with the futures leg (only reduced by the premium)
    expect(deepITM.pnlExpiry).toBeCloseTo((deepITM.F - F - premium) * LOT, -1)
  })
})

describe('computePayoff — pnlToday with an unusable leg IV', () => {
  test('a CE/PE leg with iv:0 and no liveIV override falls back to intrinsic value, not a fabricated zero price', () => {
    // Regression test: leg.iv can end up 0 (not null) for a leg built on an
    // illiquid strike. Feeding 0 straight into black76() would price the leg
    // at a flat zero regardless of time-to-expiry, making pnlToday collapse
    // to exactly -premium (as if the position were already worthless) even
    // with real time value left. It should fall back to intrinsic instead —
    // the same treatment pnlExpiry already gets.
    const legs: Leg[] = [{ strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: 0 }]
    const payoff = computePayoff(legs, range(F), LOT, T, R)

    const deepITM = payoff[payoff.length - 1]
    expect(deepITM.pnlToday).toBeCloseTo(deepITM.pnlExpiry, -2)
    expect(deepITM.pnlToday).not.toBeCloseTo(-500 * LOT, -2)
  })

  test('a leg with iv:0 is healed by a liveIV override, same as computePayoff already does for a healthy leg', () => {
    const withRealIV: Leg[]  = [{ strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: IV }]
    const withZeroIV: Leg[]  = [{ strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: 0 }]
    const payoffReal = computePayoff(withRealIV, range(F), LOT, T, R, IV * 100)
    const payoffHealed = computePayoff(withZeroIV, range(F), LOT, T, R, IV * 100)

    payoffHealed.forEach((p, i) => expect(p.pnlToday).toBeCloseTo(payoffReal[i].pnlToday, -6))
  })
})

describe('computeNetGreeks — unusable leg IV', () => {
  test('a leg with iv:0 and no liveIV override contributes nothing, rather than degenerating via black76', () => {
    const legs: Leg[] = [{ strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: 0 }]
    const g = computeNetGreeks(legs, F, T, R, LOT)
    expect(g).toEqual({ delta: 0, gamma: 0, theta: 0, vega: 0 })
  })

  test('a leg with iv:0 is healed by a liveIV override — closes the share-link gap where a corrupted leg.iv would otherwise stay broken even in a healthy session', () => {
    const withRealIV: Leg[] = [{ strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: IV }]
    const withZeroIV: Leg[] = [{ strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: 0 }]
    const gReal   = computeNetGreeks(withRealIV, F, T, R, LOT)
    const gHealed = computeNetGreeks(withZeroIV, F, T, R, LOT, IV * 100)
    expect(gHealed).toEqual(gReal)
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

describe('computeProbOfProfit', () => {
  const sigmaT = IV * Math.sqrt(T) // matches computeExpectedMoveCone's zero-drift sigmaT

  test('long call: matches the hand-computed lognormal tail probability past the single breakeven', () => {
    const legs: Leg[] = [{ strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: IV }]
    const payoff = computePayoff(legs, range(F, 0.12, 200), LOT, 0, R)
    const bes = computeBreakevens(payoff)
    expect(bes.length).toBe(1)

    const pop = computeProbOfProfit(payoff, bes, F, sigmaT)
    const expected = 1 - normalCDF(Math.log(bes[0] / F) / sigmaT)
    expect(pop).toBeCloseTo(expected, 4)
  })

  test('long straddle: matches the hand-computed lognormal probability outside both breakevens', () => {
    const prem = 500
    const legs: Leg[] = [
      { strike: F, type: 'CE', action: 'BUY', qty: 1, premium: prem, iv: IV },
      { strike: F, type: 'PE', action: 'BUY', qty: 1, premium: prem, iv: IV },
    ]
    const payoff = computePayoff(legs, range(F, 0.12, 200), LOT, 0, R)
    const bes = computeBreakevens(payoff)
    expect(bes.length).toBe(2)

    const pop = computeProbOfProfit(payoff, bes, F, sigmaT)
    const lossProb = normalCDF(Math.log(bes[1] / F) / sigmaT) - normalCDF(Math.log(bes[0] / F) / sigmaT)
    expect(pop).toBeCloseTo(1 - lossProb, 4)
  })

  test('falls back to naive point-count when sigmaT is unavailable (e.g. IV/T not yet loaded)', () => {
    const legs: Leg[] = [{ strike: F, type: 'CE', action: 'BUY', qty: 1, premium: 500, iv: IV }]
    const payoff = computePayoff(legs, range(F, 0.12, 200), LOT, 0, R)
    const bes = computeBreakevens(payoff)

    const pop = computeProbOfProfit(payoff, bes, F, 0)
    const naive = payoff.filter(p => p.pnlExpiry >= 0).length / payoff.length
    expect(pop).toBe(naive)
  })

  test('empty payoff returns 0 rather than NaN', () => {
    expect(computeProbOfProfit([], [], F, sigmaT)).toBe(0)
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

describe('computeMaxProfitLoss — futures leg', () => {
  test('a lone long futures position is unlimited in both directions', () => {
    const legs: Leg[] = [{ strike: F, type: 'FUT', action: 'BUY', qty: 1, premium: F, iv: 0 }]
    const payoff = computePayoff(legs, range(F, 0.15, 200), LOT, 0, R)
    const { maxProfit, maxLoss } = computeMaxProfitLoss(payoff)
    expect(maxProfit).toBeNull()
    expect(maxLoss).toBeNull()
  })
})

describe('computeNetGreeks', () => {
  test('futures leg: delta equals signed lot size, all other Greeks are zero', () => {
    const long: Leg[]  = [{ strike: F, type: 'FUT', action: 'BUY',  qty: 2, premium: F, iv: 0 }]
    const short: Leg[] = [{ strike: F, type: 'FUT', action: 'SELL', qty: 2, premium: F, iv: 0 }]
    const gLong  = computeNetGreeks(long, F, T, R, LOT)
    const gShort = computeNetGreeks(short, F, T, R, LOT)

    expect(gLong.delta).toBeCloseTo(2 * LOT, -6)
    expect(gLong.gamma).toBe(0)
    expect(gLong.theta).toBe(0)
    expect(gLong.vega).toBe(0)

    expect(gShort.delta).toBeCloseTo(-2 * LOT, -6)
    expect(gShort.gamma).toBe(0)
    expect(gShort.theta).toBe(0)
    expect(gShort.vega).toBe(0)
  })

  test('covered call: net delta is futures delta minus the short call\'s delta', () => {
    const legs: Leg[] = [
      { strike: F, type: 'FUT', action: 'BUY',  qty: 1, premium: F, iv: 0 },
      { strike: F, type: 'CE', action: 'SELL', qty: 1, premium: 500, iv: IV },
    ]
    const g = computeNetGreeks(legs, F, T, R, LOT)
    // Long futures delta (+lot) minus a roughly-ATM short call's delta (~0.5*lot) → positive but less than the lone futures delta
    expect(g.delta).toBeGreaterThan(0)
    expect(g.delta).toBeLessThan(LOT)
  })
})

describe('computeNetGreeks — options only', () => {
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

describe('computeExpectedMoveCone', () => {
  test('returns null when futurePrice, ivPct, or T is non-positive', () => {
    expect(computeExpectedMoveCone(0, 20, 30 / 365)).toBeNull()
    expect(computeExpectedMoveCone(F, 0, 30 / 365)).toBeNull()
    expect(computeExpectedMoveCone(F, 20, 0)).toBeNull()
    expect(computeExpectedMoveCone(-F, 20, 30 / 365)).toBeNull()
  })

  test('band is symmetric in log-space around the current price and widens with sigma', () => {
    const cone = computeExpectedMoveCone(F, 20, 30 / 365)!
    expect(cone).not.toBeNull()
    // geometric mean of the band bounds equals F (lognormal symmetry)
    expect(Math.sqrt(cone.oneSigma[0] * cone.oneSigma[1])).toBeCloseTo(F, 0)
    expect(Math.sqrt(cone.twoSigma[0] * cone.twoSigma[1])).toBeCloseTo(F, 0)
    // 2-sigma band strictly contains the 1-sigma band
    expect(cone.twoSigma[0]).toBeLessThan(cone.oneSigma[0])
    expect(cone.twoSigma[1]).toBeGreaterThan(cone.oneSigma[1])
    // matches the closed-form F * exp(±z * sigma_T)
    const sigmaT = 0.20 * Math.sqrt(30 / 365)
    expect(cone.sigmaT).toBeCloseTo(sigmaT, 6)
    expect(cone.oneSigma[1]).toBeCloseTo(F * Math.exp(sigmaT), 2)
    expect(cone.oneSigma[0]).toBeCloseTo(F * Math.exp(-sigmaT), 2)
  })

  test('higher IV or longer time-to-expiry widens the band', () => {
    const base   = computeExpectedMoveCone(F, 20, 30 / 365)!
    const higherIV = computeExpectedMoveCone(F, 40, 30 / 365)!
    const longerT  = computeExpectedMoveCone(F, 20, 90 / 365)!
    expect(higherIV.oneSigma[1] - higherIV.oneSigma[0]).toBeGreaterThan(base.oneSigma[1] - base.oneSigma[0])
    expect(longerT.oneSigma[1] - longerT.oneSigma[0]).toBeGreaterThan(base.oneSigma[1] - base.oneSigma[0])
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

  test('covered call: FUT leg contributes zero — only the short call premium counts', () => {
    // FUT leg.premium is the entry futures price (~90000), not an option
    // premium — entering a futures leg isn't a cash debit, only margin is
    // required (surfaced separately). Only the short call's real premium
    // should show up as a credit.
    const legs: Leg[] = [
      { strike: F,     type: 'FUT', action: 'BUY',  qty: 1, premium: F,   iv: 0  },
      { strike: F * 1.02, type: 'CE', action: 'SELL', qty: 1, premium: 400, iv: IV },
    ]
    expect(computeNetCost(legs)).toBeCloseTo(-400)
  })

  test('pure FUT position: net cost is zero', () => {
    const legs: Leg[] = [{ strike: F, type: 'FUT', action: 'BUY', qty: 1, premium: F, iv: 0 }]
    expect(computeNetCost(legs)).toBe(0)
  })
})
