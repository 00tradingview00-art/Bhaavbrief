import { describe, it, expect } from 'vitest'
import { formatAsOfIST } from './formatTime'

describe('formatAsOfIST', () => {
  const now = new Date('2026-09-30T06:30:00Z') // 12:00 IST, 30 Sep

  it('shows only the time for data from today (IST)', () => {
    const label = formatAsOfIST('2026-09-30T04:14:00Z', now)
    expect(label).toMatch(/09:44/)
    expect(label).not.toMatch(/Sep/)
  })

  it('includes the date for data carried over from an earlier day', () => {
    const label = formatAsOfIST('2026-09-26T17:55:00Z', now) // Fri 26 Sep 23:25 IST
    expect(label).toMatch(/26 Sep/)
    expect(label).toMatch(/IST$/)
  })
})
