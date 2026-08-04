import { describe, test, expect, vi, afterEach } from 'vitest'
import { isMCXOpenNow } from './snapshot'

afterEach(() => {
  vi.useRealTimers()
})

describe('isMCXOpenNow', () => {
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
