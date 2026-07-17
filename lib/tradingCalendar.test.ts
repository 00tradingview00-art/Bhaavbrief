import { describe, test, expect, vi, afterEach } from 'vitest'
import { todayIST, isTradingDay, toISTDate, isTodaysBriefDelayed } from './tradingCalendar'

afterEach(() => {
  vi.useRealTimers()
})

describe('isTradingDay — regression test for the Monday-detection bug', () => {
  // Code-review finding: the old date-anchor pattern (`dateStr + 'T00:00:00+05:30'`)
  // put midnight IST on the previous UTC calendar day, so under a UTC-default
  // runtime (GitHub Actions, Vercel) .getDay() returned the WRONG weekday —
  // every real Monday evaluated as Sunday. This is the case that caught it.
  test('a real Monday is a trading day, not misclassified as a weekend', () => {
    expect(isTradingDay('2026-07-20')).toBe(true) // 2026-07-20 is a Monday
  })

  test('a real Friday is a trading day', () => {
    expect(isTradingDay('2026-07-17')).toBe(true)
  })

  test('a real Saturday is not a trading day', () => {
    expect(isTradingDay('2026-07-18')).toBe(false)
  })

  test('a real Sunday is not a trading day', () => {
    expect(isTradingDay('2026-07-19')).toBe(false)
  })

  test('a listed market holiday (Muharram) is not a trading day even though it is a weekday', () => {
    expect(isTradingDay('2026-06-26')).toBe(false) // Friday, listed in data/market-holidays.json
  })
})

describe('toISTDate — UTC/IST date-basis fix', () => {
  test('a timestamp after midnight IST but still the same UTC day rolls to the next IST date', () => {
    // 19:00 UTC = 00:30 IST the *next* calendar day.
    expect(toISTDate('2026-07-17T19:00:00.000Z')).toBe('2026-07-18')
  })

  test('a normal morning-brief timestamp (04:03 UTC = 9:33 IST) stays on the same date', () => {
    expect(toISTDate('2026-07-17T04:03:23.646Z')).toBe('2026-07-17')
  })

  test('an unparseable timestamp returns null instead of throwing', () => {
    expect(toISTDate('not-a-date')).toBeNull()
  })
})

describe('isTodaysBriefDelayed', () => {
  test('not delayed before the 10:00 AM IST deadline, even with no brief', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T03:00:00.000Z')) // 08:30 IST, before deadline
    expect(isTodaysBriefDelayed(undefined)).toBe(false)
  })

  test('delayed after the deadline on a trading day with no matching brief', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T06:00:00.000Z')) // 11:30 IST, past deadline
    expect(isTodaysBriefDelayed('2026-07-16T04:00:00.000Z')).toBe(true) // yesterday's brief
  })

  test('not delayed when today\'s brief exists', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T06:00:00.000Z')) // 11:30 IST, past deadline
    expect(isTodaysBriefDelayed('2026-07-17T04:03:23.646Z')).toBe(false)
  })

  test('never delayed on a non-trading day, regardless of time or brief presence', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-18T06:00:00.000Z')) // Saturday, 11:30 IST
    expect(isTodaysBriefDelayed(undefined)).toBe(false)
  })
})

describe('todayIST — sanity', () => {
  test('returns a YYYY-MM-DD string', () => {
    expect(todayIST()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
