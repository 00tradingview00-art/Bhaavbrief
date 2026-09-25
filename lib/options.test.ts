import { describe, test, expect } from 'vitest'
import { classifyQuote, pickDefaultExpiry } from './options'

describe('pickDefaultExpiry', () => {
  test('picks the nearest expiry that is today or later, skipping already-passed ones', () => {
    // Reproduces the live bug: Kite's instrument master still listed
    // 2026-09-25 the Saturday after it expired, alongside real upcoming
    // expiries — the default must skip the dead one.
    const expiries = ['2026-09-25', '2026-10-30', '2026-11-27']
    expect(pickDefaultExpiry(expiries, '2026-09-26')).toBe('2026-10-30')
  })

  test("today's own expiry is still picked (not skipped) on expiry day itself", () => {
    const expiries = ['2026-09-25', '2026-10-30']
    expect(pickDefaultExpiry(expiries, '2026-09-25')).toBe('2026-09-25')
  })

  test('falls back to the last entry instead of throwing if every expiry has passed', () => {
    const expiries = ['2026-01-01', '2026-02-01']
    expect(pickDefaultExpiry(expiries, '2026-09-26')).toBe('2026-02-01')
  })

  test('returns the only expiry when there is just one, whether past or future', () => {
    expect(pickDefaultExpiry(['2026-12-31'], '2026-09-26')).toBe('2026-12-31')
    expect(pickDefaultExpiry(['2026-01-01'], '2026-09-26')).toBe('2026-01-01')
  })
})

// Regression tests for the D-06 no-arbitrage/liquidity filter. Every case
// below (except the synthetic NaN/crossed-market ones) is a real row pulled
// from the live MCX GOLD chain on 2026-07-17 during the audit that motivated
// this filter — see lib/options.ts's classifyQuote for the full writeup.
// futurePrice was ~140020 that day; intrinsic/upperBound below are computed
// the same way getOptionsChain does (discounted, df ≈ 0.998 for ~11 days to
// expiry — close enough to 1 that the undiscounted approximation used here
// doesn't change any of these verdicts).

describe('classifyQuote — real rows from the 2026-07-17 audit', () => {
  test('strike 115500 CE: zero OI/volume, no quote at all -> JUNK', () => {
    // ltp=26289 was a leftover print; no live market at all.
    const r = classifyQuote(26289, 0, 0, null, null, 24520 /* F-K */, 140020)
    expect(r.tier).toBe('JUNK')
    expect(r.validForSolve).toBe(false)
  })

  test('strike 143500 PE: LTP below its own intrinsic value -> JUNK (no-arbitrage violation)', () => {
    // K=143500, F=140020 -> intrinsic = K-F = 3480. LTP was 3372, i.e. below intrinsic.
    const r = classifyQuote(3372, 1, 5, 945, 5224, 3480, 143500)
    expect(r.tier).toBe('JUNK')
    expect(r.validForSolve).toBe(false)
  })

  test('strike 146500 PE: bid/ask spread of ~200% of mid -> JUNK', () => {
    const r = classifyQuote(5465.5, 0, 0, 3, 30999.5, 6480, 146500)
    expect(r.tier).toBe('JUNK')
  })

  test('strike 140000 (ATM, real trading both sides) -> LIVE with tight spread', () => {
    const r = classifyQuote(2344, 311, 1077, 2402.5, 2420, 20, 140020)
    expect(r.tier).toBe('LIVE')
    expect(r.validForSolve).toBe(true)
  })

  test('strike 138000 CE (liquid, moderately ITM) -> LIVE', () => {
    const r = classifyQuote(3572.5, 37, 8, 3469, 3732, 2020, 140020)
    expect(r.tier).toBe('LIVE')
  })
})

describe('classifyQuote — code-review findings (NaN guards, crossed market)', () => {
  test('NaN ltp is never LIVE or STALE, regardless of otherwise-healthy OI/volume/spread', () => {
    const r = classifyQuote(NaN, 379, 228, 142, 156, 0, 300000)
    expect(r.tier).toBe('JUNK')
    expect(r.validForSolve).toBe(false)
  })

  test('NaN bid falls back to STALE when there is real OI+volume (same as a null bid)', () => {
    const r = classifyQuote(100, 100, 50, NaN, 156, 0, 300000)
    expect(r.tier).toBe('STALE')
  })

  test('NaN bid with zero OI+volume has nothing to fall back to -> JUNK', () => {
    const r = classifyQuote(100, 0, 0, NaN, 156, 0, 300000)
    expect(r.tier).toBe('JUNK')
  })

  test('crossed market (ask < bid) is JUNK, not a suspiciously tight spread', () => {
    // Without the explicit check, (ask-bid) is negative, which trivially
    // passes "spreadRatio > JUNK_MAX" — this must not slip through as LIVE.
    const r = classifyQuote(100, 100, 50, 200, 50, 0, 300000)
    expect(r.tier).toBe('JUNK')
  })
})

describe('classifyQuote — liquidity tier boundaries', () => {
  test('has OI but did not trade today -> STALE, not LIVE', () => {
    const r = classifyQuote(100, 50, 0, 95, 105, 0, 300000)
    expect(r.tier).toBe('STALE')
    expect(r.validForSolve).toBe(true)
  })

  test('traded today, tight spread (<=15% of mid) -> LIVE', () => {
    const r = classifyQuote(100, 10, 5, 97, 103, 0, 300000) // spread 6/100 = 6%
    expect(r.tier).toBe('LIVE')
  })

  test('traded today, wide but not JUNK-level spread (15-40% of mid) -> STALE', () => {
    const r = classifyQuote(100, 10, 5, 80, 120, 0, 300000) // spread 40/100 = 40%, right at the JUNK boundary
    expect(r.tier).not.toBe('LIVE')
  })
})
