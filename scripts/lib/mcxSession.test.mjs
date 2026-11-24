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

  it('still dates a partial-holiday evening session, not null (Guru Nanak Jayanti)', () => {
    // Tue 24 Nov 2026 20:00 IST — the evening brief job's real target session
    expect(tradingSessionDate(at('2026-11-24T14:30:00Z'))).toBe('2026-11-24')
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

  it('is closed during the morning on a partial holiday (Guru Nanak Jayanti)', () => {
    expect(isMcxOpen(at('2026-11-24T06:30:00Z'))).toBe(false) // Tue 12:00 IST
  })

  it('reopens for the evening session on a partial holiday', () => {
    expect(isMcxOpen(at('2026-11-24T11:30:00Z'))).toBe(true) // Tue 17:00 IST
    expect(isMcxOpen(at('2026-11-24T11:29:00Z'))).toBe(false) // Tue 16:59 IST
  })

  it('closes early on New Year\'s Day (morning open, evening closed)', () => {
    expect(isMcxOpen(at('2026-01-01T06:30:00Z'))).toBe(true)  // Thu 12:00 IST — morning, open
    expect(isMcxOpen(at('2026-01-01T14:30:00Z'))).toBe(false) // Thu 20:00 IST — evening, closed
  })

  it('opens only for the Muhurat window on an otherwise-closed Sunday', () => {
    expect(isMcxOpen(at('2026-11-08T08:30:00Z'))).toBe(false) // Sun 14:00 IST — before window
    expect(isMcxOpen(at('2026-11-08T08:55:00Z'))).toBe(true)  // Sun 14:25 IST — inside window
    expect(isMcxOpen(at('2026-11-08T10:30:00Z'))).toBe(false) // Sun 16:00 IST — after window
  })
})
