import { describe, expect, test } from 'vitest'
import { priorSessionReading } from './compositeHistory'

// 2026-10-05..09 are Mon–Fri trading sessions; 10 and 11 Oct are the weekend.
const ENTRIES = [
  { date: '2026-10-06', value: 36.8 },
  { date: '2026-10-07', value: 36.2 },
  { date: '2026-10-08', value: 36.0 },
  { date: '2026-10-09', value: 36.2 },
]

// 12:00 IST on the given IST date.
const istNoon = (date: string) => new Date(`${date}T06:30:00Z`)

describe('priorSessionReading', () => {
  test('mid-session, returns the last completed session, not today', () => {
    expect(priorSessionReading(ENTRIES, istNoon('2026-10-12'))).toEqual({ date: '2026-10-09', value: 36.2 })
  })

  test('once today has been stored, it is excluded as the live session', () => {
    const withToday = [...ENTRIES, { date: '2026-10-12', value: 37.5 }]
    expect(priorSessionReading(withToday, istNoon('2026-10-12'))).toEqual({ date: '2026-10-09', value: 36.2 })
  })

  test('after midnight, the session still resolves to the day that just closed', () => {
    // 00:30 IST on 13 Oct belongs to the 12 Oct session.
    const withMonday = [...ENTRIES, { date: '2026-10-12', value: 37.5 }]
    expect(priorSessionReading(withMonday, new Date('2026-10-12T19:00:00Z'))).toEqual({ date: '2026-10-09', value: 36.2 })
  })

  test('on a weekend the newest stored close is the live value, so it compares to the day before', () => {
    expect(priorSessionReading(ENTRIES, istNoon('2026-10-11'))).toEqual({ date: '2026-10-08', value: 36.0 })
  })

  test('returns null with no history, or with only the live session stored', () => {
    expect(priorSessionReading([], istNoon('2026-10-12'))).toBeNull()
    expect(priorSessionReading([{ date: '2026-10-12', value: 37.5 }], istNoon('2026-10-12'))).toBeNull()
  })
})
