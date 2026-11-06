import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getClientIp, checkRateLimit, checkFixedWindowRateLimit } from './rateLimit'

const fetchMock = vi.fn()

beforeEach(() => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
})

function jsonRes(result: unknown) {
  return new Response(JSON.stringify({ result }), { status: 200 })
}

describe('getClientIp', () => {
  it('takes the last x-forwarded-for entry (Vercel-appended, not client-spoofable)', () => {
    const req = { headers: { get: (n: string) => (n === 'x-forwarded-for' ? '1.2.3.4, 9.9.9.9' : null) } }
    expect(getClientIp(req)).toBe('9.9.9.9')
  })

  it('falls back to x-real-ip, then unknown', () => {
    const noXff = { headers: { get: (n: string) => (n === 'x-real-ip' ? '5.5.5.5' : null) } }
    expect(getClientIp(noXff)).toBe('5.5.5.5')
    const neither = { headers: { get: () => null } }
    expect(getClientIp(neither)).toBe('unknown')
  })
})

describe('checkRateLimit (sliding window)', () => {
  it('fails open when Redis env is unset', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    expect(await checkRateLimit('k', 3, 1000)).toBe(true)
  })

  it('fails open on a Redis error', async () => {
    fetchMock.mockRejectedValue(new Error('down'))
    expect(await checkRateLimit('k', 3, 1000)).toBe(true)
  })

  it('allows under the limit, blocks over it', async () => {
    fetchMock.mockResolvedValue(jsonRes(2))
    expect(await checkRateLimit('k', 3, 1000)).toBe(true)
    fetchMock.mockResolvedValue(jsonRes(4))
    expect(await checkRateLimit('k', 3, 1000)).toBe(false)
  })
})

describe('checkFixedWindowRateLimit', () => {
  it('fails open when Redis env is unset', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    expect(await checkFixedWindowRateLimit('k', 10, 60)).toBe(true)
  })

  it('fails open on a Redis error', async () => {
    fetchMock.mockRejectedValue(new Error('down'))
    expect(await checkFixedWindowRateLimit('k', 10, 60)).toBe(true)
  })

  it('always issues SET...NX before INCR, so the key can never end up without a TTL', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(null)).mockResolvedValueOnce(jsonRes(1))
    expect(await checkFixedWindowRateLimit('k', 10, 60)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/set/k/0/EX/60/NX')
    expect(String(fetchMock.mock.calls[1][0])).toContain('/incr/k')
  })

  it('allows under the limit, blocks once the count exceeds it', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(null)).mockResolvedValueOnce(jsonRes(9))
    expect(await checkFixedWindowRateLimit('k', 10, 60)).toBe(true)

    fetchMock.mockResolvedValueOnce(jsonRes(null)).mockResolvedValueOnce(jsonRes(11))
    expect(await checkFixedWindowRateLimit('k', 10, 60)).toBe(false)
  })
})
