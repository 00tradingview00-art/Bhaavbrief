import { describe, it, expect } from 'vitest'
import { isUsDst, mcxCloseMinutesIST, isWithinMcxHours } from './mcxHours.js'

const at = iso => new Date(iso) // UTC instants; IST = UTC + 5:30

describe('isUsDst', () => {
  it('matches the 2026 US switches (8 Mar → 1 Nov)', () => {
    expect(isUsDst('2026-03-06')).toBe(false) // Fri before
    expect(isUsDst('2026-03-09')).toBe(true)  // Mon after
    expect(isUsDst('2026-10-30')).toBe(true)  // last Friday of summer hours
    expect(isUsDst('2026-11-02')).toBe(false) // first Monday of winter hours
  })

  it('matches the 2027 US switches (14 Mar → 7 Nov)', () => {
    expect(isUsDst('2027-03-12')).toBe(false)
    expect(isUsDst('2027-03-15')).toBe(true)
    expect(isUsDst('2027-11-05')).toBe(true)
    expect(isUsDst('2027-11-08')).toBe(false)
  })
})

describe('mcxCloseMinutesIST', () => {
  it('is 23:30 in summer and 23:55 in winter', () => {
    expect(mcxCloseMinutesIST('2026-10-30')).toBe(23 * 60 + 30)
    expect(mcxCloseMinutesIST('2026-11-02')).toBe(23 * 60 + 55)
  })
})

describe('isWithinMcxHours', () => {
  it('opens at 09:00 IST', () => {
    expect(isWithinMcxHours(at('2026-09-30T03:29:00Z'))).toBe(false) // 08:59
    expect(isWithinMcxHours(at('2026-09-30T03:30:00Z'))).toBe(true)  // 09:00
  })

  it('closes at 23:30 IST in summer', () => {
    expect(isWithinMcxHours(at('2026-10-30T17:59:00Z'))).toBe(true)  // Fri 23:29
    expect(isWithinMcxHours(at('2026-10-30T18:00:00Z'))).toBe(false) // Fri 23:30
  })

  it('stays open until 23:55 IST in winter', () => {
    expect(isWithinMcxHours(at('2026-11-02T18:10:00Z'))).toBe(true)  // Mon 23:40
    expect(isWithinMcxHours(at('2026-11-02T18:25:00Z'))).toBe(false) // Mon 23:55
  })

  it('is closed on weekends', () => {
    expect(isWithinMcxHours(at('2026-10-03T06:30:00Z'))).toBe(false) // Sat 12:00
    expect(isWithinMcxHours(at('2026-10-04T06:30:00Z'))).toBe(false) // Sun 12:00
  })
})
