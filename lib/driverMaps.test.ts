import { describe, expect, test } from 'vitest'
import { DRIVER_MAPS_COPY, formatEventTime, getDriverMaps, goldSilverRatio } from './driverMaps'
import { visualCopyViolations } from './visualCopyCompliance'
import type { PriceData } from './prices'

function row(mcx: number, mcxChangePct: number, mcxStale = false) {
  return { mcx, mcxChangePct, mcxStale, mcxChange: 0, mcxOpen: 0, mcxHigh: 0, mcxLow: 0, mcxPrevClose: 0, mcxVolume: 0, mcxOI: 0, mcxSymbol: '', mcxExpiry: '' }
}

function prices(overrides: Partial<PriceData> = {}): PriceData {
  return {
    source: 'kite+twelvedata', updatedAt: '2026-10-01T04:00:00.000Z', generatedAtIST: '2026-10-01 09:30 IST', marketOpen: true,
    usdinr: 88, usdinrChangePct: 0.1, comexGold: 3800, comexSilver: 46, wti: 62, brent: 66, comexCopper: 4.8, henryHub: 3.2,
    goldComexPct: 0.7, silverComexPct: -0.4, crudePct: -1.1, brentPct: -1, copperComexPct: 0, gasPct: 0.9,
    gold: { ...row(118000, 0.4), comex: 3800, comexChangePct: 0.7 },
    silver: { ...row(140000, 0.6), comex: 46, comexChangePct: -0.4 },
    crude: { ...row(5400, -1.5), wti: 62, wtiChangePct: -1.1, brent: 66, brentChangePct: -1 },
    copper: row(1000, 0), natgas: row(280, 0),
    ...overrides,
  }
}

const byKey = (p: PriceData, key: string) => getDriverMaps(p).maps.find(m => m.key === key)!

describe('getDriverMaps', () => {
  test('describes same and opposite direction in plain sentences', () => {
    const p = prices()
    expect(byKey(p, 'gold').sentence).toBe('Global gold and MCX Gold are moving in the same direction.')
    expect(byKey(p, 'silver').sentence).toBe('Global silver and MCX Silver are moving in opposite directions.')
    expect(byKey(p, 'crude').relationship).toBe('same')
  })

  test('treats a failed benchmark fetch as unavailable, never as 0%', () => {
    const gold = byKey(prices({ comexGold: 0, goldComexPct: 0 }), 'gold')
    expect(gold.benchmark.changePct).toBeNull()
    expect(gold.relationship).toBe('none')
    expect(gold.sentence).toBe(DRIVER_MAPS_COPY.noComparison)
  })

  test('treats a missing USD/INR rate as unavailable', () => {
    expect(byKey(prices({ usdinr: 0, usdinrChangePct: 0 }), 'gold').usdinr.changePct).toBeNull()
  })

  test('a flat move is neutral and makes no direction claim', () => {
    const natgas = byKey(prices(), 'natgas')
    expect(natgas.mcx).toEqual({ changePct: 0, tone: 'neutral' })
    expect(natgas.relationship).toBe('none')
  })

  test('marks delayed MCX data and makes no comparison from it', () => {
    const gold = byKey(prices({ gold: { ...prices().gold, mcxStale: true } }), 'gold')
    expect(gold.mcxStale).toBe(true)
    expect(gold.relationship).toBe('none')
    expect(getDriverMaps(prices({ snapshotStale: true })).maps.every(m => m.mcxStale)).toBe(true)
  })

  test('reports whether the session is open', () => {
    expect(getDriverMaps(prices()).sessionOpen).toBe(true)
    expect(getDriverMaps(prices({ marketOpen: false })).sessionOpen).toBe(false)
    expect(getDriverMaps(null)).toEqual({ maps: [], timestamp: null, sessionOpen: false })
  })

  test('all driver map copy stays within the allowed language', () => {
    const p = prices()
    const generated = getDriverMaps(p).maps.map(m => m.sentence)
    for (const text of [...generated, ...Object.values(DRIVER_MAPS_COPY)]) expect(visualCopyViolations(text)).toEqual([])
  })

  test('silver shows the gold/silver ratio, or unavailable without both prices', () => {
    expect(goldSilverRatio(prices())).toBeCloseTo(3800 / 46, 6)
    expect(byKey(prices(), 'silver').extras).toEqual([{ label: DRIVER_MAPS_COPY.goldSilverRatio, value: (3800 / 46).toFixed(1) }])
    expect(byKey(prices({ comexSilver: 0 }), 'silver').extras[0].value).toBeNull()
  })

  test('gold shows the import gap only when the server supplied context', () => {
    expect(byKey(prices(), 'gold').extras).toEqual([])
    const withGap = getDriverMaps(prices(), { goldImportGapPct: 0.624, events: {} }).maps.find(m => m.key === 'gold')!
    expect(withGap.extras).toEqual([{ label: DRIVER_MAPS_COPY.importGap, value: '+0.62%' }])
    const noGap = getDriverMaps(prices(), { goldImportGapPct: null, events: {} }).maps.find(m => m.key === 'gold')!
    expect(noGap.extras[0].value).toBeNull()
  })

  test('crude and natural gas show the next EIA release in IST when one is scheduled', () => {
    const context = { goldImportGapPct: null, events: { crude: { name: 'EIA Weekly Petroleum Status Report', releaseUtc: '2026-10-07T14:30:00.000Z' } } }
    const maps = getDriverMaps(prices(), context).maps
    expect(maps.find(m => m.key === 'crude')!.extras).toEqual([{ label: DRIVER_MAPS_COPY.nextEia, value: 'Wed 7 Oct · 8:00 PM IST' }])
    expect(maps.find(m => m.key === 'natgas')!.extras).toEqual([])
  })

  test('an unparseable release time shows no row', () => {
    expect(formatEventTime('not a date')).toBeNull()
  })

  test('extra row labels stay within the allowed language', () => {
    for (const text of [DRIVER_MAPS_COPY.importGap, DRIVER_MAPS_COPY.goldSilverRatio, DRIVER_MAPS_COPY.nextEia]) expect(visualCopyViolations(text)).toEqual([])
  })
})
