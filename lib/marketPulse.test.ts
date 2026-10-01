import { describe, expect, test } from 'vitest'
import { formatPulseTime, getMarketPulse, marketPulseSummary } from './marketPulse'
import type { PriceData } from './prices'

function row(mcx: number, mcxChangePct: number, mcxStale = false) {
  return { mcx, mcxChangePct, mcxStale, mcxChange: 0, mcxOpen: 0, mcxHigh: 0, mcxLow: 0, mcxPrevClose: 0, mcxVolume: 0, mcxOI: 0, mcxSymbol: '', mcxExpiry: '' }
}

function prices(overrides: Partial<PriceData> = {}): PriceData {
  return {
    source: 'kite+twelvedata', updatedAt: '2026-10-01T04:00:00.000Z', generatedAtIST: '2026-10-01 09:30 IST', marketOpen: true,
    usdinr: 83, usdinrChangePct: 0, comexGold: 0, comexSilver: 0, wti: 0, brent: 0, comexCopper: 0, henryHub: 0,
    goldComexPct: 0, silverComexPct: 0, crudePct: 0, brentPct: 0, copperComexPct: 0, gasPct: 0,
    gold: { ...row(100, 0.2), comex: 0, comexChangePct: 0 },
    silver: { ...row(100, 1.2), comex: 0, comexChangePct: 0 },
    crude: { ...row(100, -2.1), wti: 0, wtiChangePct: 0, brent: 0, brentChangePct: 0 },
    copper: row(100, -0.6), natgas: row(100, 0.8),
    ...overrides,
  }
}

describe('getMarketPulse', () => {
  test('ranks fresh instruments by absolute daily move', () => {
    const result = getMarketPulse(prices())
    expect(result.items.slice(0, 3).map(item => item.key)).toEqual(['crude', 'silver', 'natgas'])
    expect(result.lead?.key).toBe('crude')
    expect(marketPulseSummary(result.lead)).toBe("Crude Oil is among today's largest moves.")
  })

  test('keeps stale instruments visible but excludes them from the lead claim', () => {
    const result = getMarketPulse(prices({ crude: { ...prices().crude, mcxChangePct: -8, mcxStale: true } }))
    expect(result.items.at(-1)?.key).toBe('crude')
    expect(result.lead?.key).toBe('silver')
  })

  test('does not make a lead claim without three fresh instruments', () => {
    const result = getMarketPulse(prices({
      gold: { ...prices().gold, mcxStale: true },
      silver: { ...prices().silver, mcxStale: true },
      crude: { ...prices().crude, mcxStale: true },
    }))
    expect(result.lead).toBeNull()
    expect(marketPulseSummary(result.lead)).toBeNull()
  })

  test('returns an empty pulse when prices are unavailable', () => {
    expect(getMarketPulse(null)).toEqual({ items: [], lead: null, timestamp: null, sessionOpen: false })
  })

  test('does not name a lead move when every fresh market is flat', () => {
    const flat = prices({
      gold: { ...prices().gold, mcxChangePct: 0 }, silver: { ...prices().silver, mcxChangePct: 0 },
      crude: { ...prices().crude, mcxChangePct: 0 }, copper: row(100, 0), natgas: row(100, 0),
    })
    expect(getMarketPulse(flat).lead).toBeNull()
  })

  test('describes the last session, not today, when MCX is closed', () => {
    const result = getMarketPulse(prices({ marketOpen: false }))
    expect(result.sessionOpen).toBe(false)
    expect(marketPulseSummary(result.lead, result.sessionOpen)).toBe('Crude Oil was among the largest moves in the last session.')
  })
})

describe('formatPulseTime', () => {
  test('keeps the IST time from the snapshot', () => {
    expect(formatPulseTime('2026-10-01 09:30 IST')).toBe('09:30 IST')
  })

  test('converts a UTC ISO fallback to IST instead of showing it raw', () => {
    expect(formatPulseTime('2026-10-01T04:00:00.000Z')).toBe('09:30 IST')
  })

  test('returns null for missing or unparseable timestamps', () => {
    expect(formatPulseTime(null)).toBeNull()
    expect(formatPulseTime('not a time')).toBeNull()
  })
})
