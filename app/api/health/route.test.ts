import { describe, it, expect, vi, beforeEach } from 'vitest'

let today = '2026-09-30'
let calendar = { loaded: true, latestYear: 2026 as number | null }

vi.mock('@/lib/tradingCalendar', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/tradingCalendar')>()),
  todayIST: () => today,
  holidayCalendarStatus: () => calendar,
}))

import { GET } from './route'

async function calendarCheck() {
  const body = await (await GET()).json()
  return body.checks.calendar
}

beforeEach(() => {
  today = '2026-09-30'
  calendar = { loaded: true, latestYear: 2026 }
})

describe('/api/health calendar check', () => {
  it('passes with this year covered outside December', async () => {
    expect((await calendarCheck()).ok).toBe(true)
  })

  it('fails when the holiday file could not be loaded', async () => {
    calendar = { loaded: false, latestYear: null }
    expect(await calendarCheck()).toMatchObject({ ok: false, reason: 'market-holidays.json not loaded' })
  })

  it("fails from 1 December until next year's holidays are added", async () => {
    today = '2026-12-01'
    expect(await calendarCheck()).toMatchObject({ ok: false, reason: 'no 2027 holidays in market-holidays.json' })
    calendar = { loaded: true, latestYear: 2027 }
    expect((await calendarCheck()).ok).toBe(true)
  })
})
