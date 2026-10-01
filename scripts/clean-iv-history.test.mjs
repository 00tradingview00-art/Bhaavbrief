import { describe, it, expect } from 'vitest'
import { planCleanup } from './clean-iv-history.mjs'

// 14 Sep 2026 (Ganesh Chaturthi) is an exchange holiday, so start on the 11th.
const weekdays = ['2026-09-11', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
  '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']

describe('planCleanup', () => {
  it('keeps a clean series untouched', () => {
    const points = weekdays.map((date, i) => ({ date, iv: 22 + (i % 3) }))
    expect(planCleanup(points)).toEqual([])
  })

  it('removes a Saturday row when Friday already has a reading (the live GOLD pattern)', () => {
    const points = [
      ...weekdays.slice(0, 9).map(date => ({ date, iv: 24 })),
      { date: '2026-09-25', iv: 23.8 },
      { date: '2026-09-26', iv: 1.17 },
    ]
    const actions = planCleanup(points)
    expect(actions.map(a => [a.action, a.date])).toEqual([['remove', '2026-09-26']])
    expect(actions[0].reason).toMatch(/2026-09-25 already has a reading/)
  })

  it("moves a weekend-dated reading to its session when that day has none (it's real data)", () => {
    const points = [
      ...weekdays.slice(0, 9).map(date => ({ date, iv: 24 })),
      { date: '2026-09-26', iv: 23.5 },
    ]
    expect(planCleanup(points)).toEqual([
      expect.objectContaining({ action: 'move', date: '2026-09-26', to: '2026-09-25', iv: 23.5 }),
    ])
  })

  it('removes a weekend-dated reading that would be implausible on its session', () => {
    const points = [
      ...weekdays.slice(0, 9).map(date => ({ date, iv: 24 })),
      { date: '2026-09-26', iv: 1.17 },
    ]
    expect(planCleanup(points).map(a => [a.action, a.date])).toEqual([['remove', '2026-09-26']])
  })

  it('removes a collapse relative to accepted history, and does not let it vouch for the next day', () => {
    const points = [
      ...weekdays.slice(0, 8).map(date => ({ date, iv: 47 })),
      { date: '2026-09-24', iv: 8.65 },
      { date: '2026-09-25', iv: 46 },
    ]
    expect(planCleanup(points).map(a => [a.action, a.date])).toEqual([['remove', '2026-09-24']])
  })
})
