import { describe, it, expect } from 'vitest'
import { istDate, isMcxOpen, tradingSessionDate } from './mcxSession.js'

// All inputs are UTC instants; IST = UTC + 5:30.
const at = iso => new Date(iso)

describe('istDate', () => {
  it('rolls to the next calendar day after 18:30 UTC', () => {
    expect(istDate(at('2026-09-25T18:29:00Z'))).toBe('2026-09-25')
    expect(istDate(at('2026-09-25T18:31:00Z'))).toBe('2026-09-26')
  })
})

describe('tradingSessionDate', () => {
  it('dates an evening run by its own session', () => {
    // Fri 25 Sep 23:35 IST
    expect(tradingSessionDate(at('2026-09-25T18:05:00Z'))).toBe('2026-09-25')
  })

  it("files a run after midnight IST under the previous day's session, not Saturday", () => {
    // Sat 26 Sep 00:40 IST — Friday's end-of-day job running late
    expect(tradingSessionDate(at('2026-09-25T19:10:00Z'))).toBe('2026-09-25')
  })

  it('returns null on a weekend day', () => {
    // Sat 26 Sep 14:00 IST
    expect(tradingSessionDate(at('2026-09-26T08:30:00Z'))).toBeNull()
  })

  it('returns null on an exchange holiday (Gandhi Jayanti, Fri 2 Oct 2026)', () => {
    expect(tradingSessionDate(at('2026-10-02T12:00:00Z'))).toBeNull()
  })

  it('a pre-open Monday moment belongs to Friday; Monday after 09:00 is Monday', () => {
    // Mon 28 Sep 08:00 IST → previous day is Sunday → no session
    expect(tradingSessionDate(at('2026-09-28T02:30:00Z'))).toBeNull()
    // Mon 28 Sep 10:00 IST
    expect(tradingSessionDate(at('2026-09-28T04:30:00Z'))).toBe('2026-09-28')
  })
})

describe('isMcxOpen', () => {
  it('is open during a normal session', () => {
    expect(isMcxOpen(at('2026-09-30T06:30:00Z'))).toBe(true) // Wed 12:00 IST
  })

  it('is closed on an exchange holiday during trading hours (Gandhi Jayanti)', () => {
    expect(isMcxOpen(at('2026-10-02T06:30:00Z'))).toBe(false) // Fri 12:00 IST
  })

  it('stays open to 23:55 IST once US DST ends', () => {
    expect(isMcxOpen(at('2026-11-02T18:10:00Z'))).toBe(true) // Mon 23:40 IST
  })
})
