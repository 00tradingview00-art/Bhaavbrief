import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  holidayCalendarStatus,
  isTradingHoliday,
  getHolidayReopenMinutes,
  getHolidayEarlyCloseMinutes,
  getSpecialOpenWindowMinutes,
  hasSessionOverride,
  getSessionNote,
} from './holidays.js'

afterEach(() => vi.restoreAllMocks())

describe('holiday calendar loading', () => {
  it('loads the calendar from the app root (how the production server finds it)', () => {
    const status = holidayCalendarStatus()
    expect(status.loaded).toBe(true)
    expect(status.latestYear).toBeGreaterThanOrEqual(2026)
  })

  it('knows a listed exchange holiday', () => {
    expect(isTradingHoliday('2026-10-02')).toBe(true) // Gandhi Jayanti
    expect(isTradingHoliday('2026-09-30')).toBe(false)
  })

  it('still finds the calendar via the script-relative path when run from another directory', () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/nonexistent-dir')
    expect(isTradingHoliday('2026-10-02')).toBe(true)
  })
})

describe('partial-holiday reopen times', () => {
  it('returns the reopen time for a partial holiday (Guru Nanak Jayanti)', () => {
    expect(getHolidayReopenMinutes('2026-11-24')).toBe(17 * 60) // 5:00 PM IST
  })

  it('returns null for a full-day holiday', () => {
    expect(getHolidayReopenMinutes('2026-10-02')).toBeNull() // Gandhi Jayanti
  })

  it('returns null for a non-holiday date', () => {
    expect(getHolidayReopenMinutes('2026-09-30')).toBeNull()
  })

  it('covers every 2026 morning-closed partial holiday', () => {
    const reopenDates = [
      '2026-01-15', '2026-03-03', '2026-03-26', '2026-03-31', '2026-04-14',
      '2026-05-01', '2026-05-28', '2026-06-26', '2026-09-14', '2026-10-20',
      '2026-11-10', '2026-11-24',
    ]
    for (const date of reopenDates) expect(getHolidayReopenMinutes(date)).toBe(17 * 60)
  })
})

describe('partial-holiday early close (New Year\'s Day)', () => {
  it('closes early at 5 PM IST on a date with closesAtIST', () => {
    expect(getHolidayEarlyCloseMinutes('2026-01-01')).toBe(17 * 60)
  })

  it('returns null on a date without an early-close override', () => {
    expect(getHolidayEarlyCloseMinutes('2026-11-24')).toBeNull()
    expect(getHolidayEarlyCloseMinutes('2026-09-30')).toBeNull()
  })
})

describe('special one-off open windows (Diwali Muhurat)', () => {
  it('returns the Muhurat window on Diwali Laxmi Pujan', () => {
    expect(getSpecialOpenWindowMinutes('2026-11-08')).toEqual({ start: 14 * 60 + 20, end: 15 * 60 + 30 })
  })

  it('returns null on a date without a special window', () => {
    expect(getSpecialOpenWindowMinutes('2026-11-24')).toBeNull()
    expect(getSpecialOpenWindowMinutes('2026-11-01')).toBeNull() // an ordinary Sunday
  })
})

describe('hasSessionOverride / getSessionNote', () => {
  it('is true for each of the three override shapes, false otherwise', () => {
    expect(hasSessionOverride('2026-01-01')).toBe(true)  // closesAtIST
    expect(hasSessionOverride('2026-11-24')).toBe(true)  // reopensAtIST
    expect(hasSessionOverride('2026-11-08')).toBe(true)  // specialOpenIST
    expect(hasSessionOverride('2026-10-02')).toBe(false) // full holiday, no override
    expect(hasSessionOverride('2026-09-30')).toBe(false) // ordinary trading day
  })

  it('prefers the override description, falls back to the plain holiday name', () => {
    expect(getSessionNote('2026-11-24')).toMatch(/Guru Nanak/)
    expect(getSessionNote('2026-10-02')).toBe('Mahatma Gandhi Jayanti')
    expect(getSessionNote('2026-09-30')).toBeNull()
  })
})
