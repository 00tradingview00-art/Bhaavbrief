import { describe, it, expect, vi, beforeEach } from 'vitest'

let userId: string | null = null
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId })) }))

const isProUser = vi.fn()
vi.mock('@/lib/subscription', () => ({
  isProUser: (id: string | null) => isProUser(id),
  hasInternalAccess: (h: Headers) => h.get('authorization') === 'Bearer internal',
}))
vi.mock('@/lib/options', () => ({ MCX_INSTRUMENTS: { GOLD: { label: 'Gold' } } }))

const TEN_DAYS = Array.from({ length: 10 }, (_, i) => ({ date: `2026-09-${String(i + 10)}`, iv: 20 + i }))
vi.mock('@/lib/ivRankHistory', () => ({ readIVHistory: vi.fn(async () => TEN_DAYS) }))

import { GET } from './route'

const req = (headers: Record<string, string> = {}) =>
  new Request('https://bhaavbrief.in/api/options/iv-history?instrument=GOLD', { headers })

beforeEach(() => {
  vi.clearAllMocks()
  userId = null
  process.env.CRON_SECRET = 'cron'
})

describe('/api/options/iv-history', () => {
  it('gives anonymous visitors only the last 5 days', async () => {
    isProUser.mockResolvedValue(false)
    const body = await (await GET(req())).json()
    expect(body.history).toEqual(TEN_DAYS.slice(-5))
    expect(body.preview).toBe(true)
  })

  it('gives Pro users the full history, privately cached', async () => {
    userId = 'user_pro'
    isProUser.mockResolvedValue(true)
    const res = await GET(req())
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    const body = await res.json()
    expect(body.history).toHaveLength(10)
    expect(body.preview).toBe(false)
  })

  it('gives the monitoring cron and internal scripts the full history', async () => {
    expect((await (await GET(req({ authorization: 'Bearer cron' }))).json()).history).toHaveLength(10)
    expect((await (await GET(req({ authorization: 'Bearer internal' }))).json()).history).toHaveLength(10)
    expect(isProUser).not.toHaveBeenCalled()
  })

  it('falls back to the free slice when the Pro check fails', async () => {
    userId = 'user_x'
    isProUser.mockRejectedValue(new Error('redis down'))
    expect((await (await GET(req())).json()).history).toHaveLength(5)
  })
})
