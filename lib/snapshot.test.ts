import { describe, test, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import { loadSnapshot, snapshotAgeMinutes, isMCXOpenNow, snapshotToPriceData, type Snapshot } from './snapshot'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function makeInstrument(price: number, prevClose: number, changePct: number) {
  return { price, prevClose, changePct, unit: 'INR' }
}

function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    generatedAt:    '2026-07-17T04:00:00.000Z',
    generatedAtIST: '2026-07-17 09:30 IST',
    source:         'kite',
    instruments: {
      MCX_GOLD:     makeInstrument(88200, 87700, 0.57),
      MCX_SILVER:   makeInstrument(102000, 101000, 0.99),
      MCX_CRUDE:    makeInstrument(6200, 6150, 0.81),
      MCX_COPPER:   makeInstrument(850, 845, 0.59),
      MCX_NATGAS:   makeInstrument(280, 275, 1.82),
      USDINR:       makeInstrument(87.5, 87.3, 0.23),
      COMEX_GOLD:   makeInstrument(2450, 2440, 0.41),
      COMEX_SILVER: makeInstrument(29, 28.8, 0.69),
      WTI:          makeInstrument(78, 77.5, 0.65),
      BRENT:        makeInstrument(82, 81.5, 0.61),
      HENRY_HUB:    makeInstrument(2.8, 2.75, 1.82),
    },
    derived: {
      importParityGoldINR:   88300,
      mcxComexGoldSpreadPct: 0.23,
      goldSilverRatio:       84.6,
    },
    ...overrides,
  }
}

describe('snapshotAgeMinutes', () => {
  test('computes elapsed minutes between generatedAt and now', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T05:30:00.000Z')) // 90 min after generatedAt
    expect(snapshotAgeMinutes(makeSnapshot())).toBeCloseTo(90, 5)
  })
})

describe('isMCXOpenNow', () => {
  test('open on a normal weekday during trading hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T06:00:00.000Z')) // Friday, 11:30 IST
    expect(isMCXOpenNow()).toBe(true)
  })

  test('closed on a weekend', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-18T06:00:00.000Z')) // Saturday, 11:30 IST
    expect(isMCXOpenNow()).toBe(false)
  })

  test('closed outside trading-hours window on an otherwise valid trading day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T00:00:00.000Z')) // Friday, 05:30 IST — before 9am open
    expect(isMCXOpenNow()).toBe(false)
  })

  test('regression: closed on a listed market holiday even though it is a weekday during trading hours', () => {
    // 2026-06-26 is a Friday and a listed MCX holiday (Muharram, data/market-holidays.json —
    // see lib/tradingCalendar.test.ts). isMCXOpenNow() previously checked weekday only and
    // ignored holidays entirely, which wrongly held the snapshot to the tight 120min
    // "market open" staleness threshold instead of the 720min "closed" threshold on every
    // market holiday.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-26T06:30:00.000Z')) // 12:00 IST
    expect(isMCXOpenNow()).toBe(false)
  })
})

describe('loadSnapshot', () => {
  test('returns the parsed snapshot when the file exists and is valid JSON', () => {
    const snap = makeSnapshot()
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(snap))
    expect(loadSnapshot()).toEqual(snap)
  })

  test('returns null when the file does not exist', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    expect(loadSnapshot()).toBeNull()
  })

  test('returns null instead of throwing on malformed JSON', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{not valid json')
    expect(loadSnapshot()).toBeNull()
  })
})

describe('snapshotToPriceData', () => {
  test('passes changePct through as-is — never recomputes it from price/prevClose', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T04:05:00.000Z')) // 5 min old, market open
    const data = snapshotToPriceData(makeSnapshot())
    expect(data.gold.mcxChangePct).toBe(0.57)
    expect(data.crude.mcxChangePct).toBe(0.81)
  })

  test('marks the snapshot stale past the 120-minute threshold while the market is open', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T06:01:00.000Z')) // 121 min old, Friday 11:31 IST
    const data = snapshotToPriceData(makeSnapshot())
    expect(data.marketOpen).toBe(true)
    expect(data.snapshotStale).toBe(true)
  })

  test('not stale within the 120-minute threshold while the market is open', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T05:59:00.000Z')) // 119 min old
    const data = snapshotToPriceData(makeSnapshot())
    expect(data.marketOpen).toBe(true)
    expect(data.snapshotStale).toBe(false)
  })

  test('uses the wider 720-minute threshold once the market is closed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-18T09:00:00.000Z')) // Saturday, 300 min after generatedAt
    const data = snapshotToPriceData(makeSnapshot({ generatedAt: '2026-07-18T04:00:00.000Z' }))
    expect(data.marketOpen).toBe(false)
    expect(data.snapshotStale).toBe(false) // 300 min < 720 min closed-market threshold
  })

  test('a missing MCX instrument key falls back to a zeroed row instead of throwing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T04:05:00.000Z'))
    const snap = makeSnapshot()
    delete (snap.instruments as Record<string, unknown>).MCX_COPPER
    const data = snapshotToPriceData(snap)
    expect(data.copper.mcx).toBe(0)
    expect(data.copper.mcxChangePct).toBe(0)
  })

  test('optional minor metals appear only when present in the snapshot', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T04:05:00.000Z'))
    expect(snapshotToPriceData(makeSnapshot()).zinc).toBeUndefined()

    const withZinc = snapshotToPriceData(makeSnapshot({
      instruments: { ...makeSnapshot().instruments, MCX_ZINC: makeInstrument(250, 248, 0.8) },
    }))
    expect(withZinc.zinc?.mcx).toBe(250)
  })
})
