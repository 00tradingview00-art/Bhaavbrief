import { describe, it, expect, afterEach, vi } from 'vitest'
import { holidayCalendarStatus, isTradingHoliday } from './holidays.js'

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
