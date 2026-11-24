import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

let today = '2026-09-30'
let calendar = { loaded: true, latestYear: 2026 as number | null }

vi.mock('@/lib/tradingCalendar', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/tradingCalendar')>()),
  todayIST: () => today,
  holidayCalendarStatus: () => calendar,
}))

import * as redisModule from '@/lib/redis'
import { GET } from './route'

async function calendarCheck() {
  const body = await (await GET()).json()
  return body.checks.calendar
}

async function engineCheck() {
  const body = await (await GET()).json()
  return body.checks.engine
}

beforeEach(() => {
  today = '2026-09-30'
  calendar = { loaded: true, latestYear: 2026 }
  // Saturday, MCX closed — isolates the engine check's Redis/file precedence
  // from the pre-existing market-open staleness branch, which this change
  // doesn't touch.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-03T06:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
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

describe('/api/health engine check', () => {
  it('reads lastChecked from Redis when available', async () => {
    // Deliberately no fs mock here — if the engine check fell through to the
    // file instead of using this Redis value, ageMinutes would be computed
    // from whatever real data/engine-state.json happens to contain, not 30.
    vi.spyOn(redisModule, 'redisCommand').mockImplementation(async (_cmd, ...args) => {
      if (args[0] === 'engine-state:latest') return JSON.stringify({ lastChecked: '2026-10-03T05:30:00.000Z' })
      throw new Error('Redis not configured')
    })
    const result = await engineCheck()
    expect(result.ageMinutes).toBe(30)
  })

  it('falls back to the file when the Redis read fails', async () => {
    // Scoped to engine-state.json's own path — a blanket mock of every
    // fs.existsSync/readFileSync call also intercepts scripts/lib/holidays.js's
    // unrelated reads of market-holidays.json / mcx-partial-holidays.json
    // (isMcxOpen's weekend/Muhurat-window check touches those even when the
    // route's own market-open branch isn't under test here), corrupting them
    // with engine-state JSON and crashing the request.
    const engineStatePath = path.join(process.cwd(), 'data/engine-state.json')
    const realExistsSync  = fs.existsSync
    const realReadFileSync = fs.readFileSync
    vi.spyOn(redisModule, 'redisCommand').mockRejectedValue(new Error('Redis not configured'))
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (p => (p === engineStatePath ? true : realExistsSync(p))) as typeof fs.existsSync,
    )
    vi.spyOn(fs, 'readFileSync').mockImplementation(((p: fs.PathOrFileDescriptor, opts: unknown) =>
      p === engineStatePath
        ? JSON.stringify({ lastChecked: '2026-10-03T05:00:00.000Z' })
        : realReadFileSync(p, opts as never)) as typeof fs.readFileSync)
    const result = await engineCheck()
    expect(result.ageMinutes).toBe(60)
  })

  it('fails when neither Redis nor the file has a lastChecked value', async () => {
    const engineStatePath = path.join(process.cwd(), 'data/engine-state.json')
    const realExistsSync  = fs.existsSync
    vi.spyOn(redisModule, 'redisCommand').mockRejectedValue(new Error('Redis not configured'))
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (p => (p === engineStatePath ? false : realExistsSync(p))) as typeof fs.existsSync,
    )
    expect(await engineCheck()).toMatchObject({
      ok: false,
      reason: 'engine-state.json missing lastChecked',
    })
  })
})
