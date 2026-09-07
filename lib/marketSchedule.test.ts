import { describe, test, expect, vi, afterEach } from 'vitest'
import { nextMCXSessionOpenISO } from './marketSchedule'

describe('nextMCXSessionOpenISO', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('before 9AM IST on a trading day -> today at 09:00 IST', () => {
    vi.useFakeTimers()
    // 2026-07-17 is a Friday (a trading day); 08:30 IST = 03:00 UTC.
    vi.setSystemTime(new Date('2026-07-17T03:00:00.000Z'))
    expect(nextMCXSessionOpenISO()).toBe('2026-07-17T03:30:00.000Z')
  })

  test('after close on a trading day -> next trading day at 09:00 IST, skipping the weekend', () => {
    vi.useFakeTimers()
    // 2026-07-17 is a Friday; 23:35 IST = 18:05 UTC same day.
    vi.setSystemTime(new Date('2026-07-17T18:05:00.000Z'))
    // 2026-07-18/19 are Sat/Sun -> next trading day is Monday 2026-07-20.
    expect(nextMCXSessionOpenISO()).toBe('2026-07-20T03:30:00.000Z')
  })

  test('on a weekend -> next Monday at 09:00 IST', () => {
    vi.useFakeTimers()
    // 2026-07-18 is a Saturday; noon IST = 06:30 UTC.
    vi.setSystemTime(new Date('2026-07-18T06:30:00.000Z'))
    expect(nextMCXSessionOpenISO()).toBe('2026-07-20T03:30:00.000Z')
  })

  test('on a declared market holiday that falls on a weekday -> skips it too', () => {
    vi.useFakeTimers()
    // 2026-06-26 is a Friday, listed in data/market-holidays.json (Muharram);
    // 10:00 IST = 04:30 UTC same day.
    vi.setSystemTime(new Date('2026-06-26T04:30:00.000Z'))
    // 06-27/28 are Sat/Sun -> next trading day is Monday 2026-06-29.
    expect(nextMCXSessionOpenISO()).toBe('2026-06-29T03:30:00.000Z')
  })
})
