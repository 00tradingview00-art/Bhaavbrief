import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const create = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({ messages: { create: (...a: unknown[]) => create(...a) } })),
}))

let status: 'allowed' | 'limited' | 'unknown' = 'allowed'
vi.mock('@/lib/rateLimit', () => ({
  rateLimitStatus: vi.fn(async () => status),
  getClientIp: () => '1.2.3.4',
}))

vi.mock('@/lib/searchIndex', () => ({
  scoreEntries: () => [{ slug: 'gold-basics', title: 'Gold basics', href: '/learn/x', score: 1 }],
  buildContentContext: () => 'ctx',
}))

import { GET } from './route'

const req = () => new NextRequest('https://bhaavbrief.in/api/search?q=gold%20margin')

beforeEach(() => {
  create.mockReset()
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('/api/search rate limiting', () => {
  it('returns 429 when the caller is over the limit', async () => {
    status = 'limited'
    expect((await GET(req())).status).toBe(429)
    expect(create).not.toHaveBeenCalled()
  })

  it('serves local matches without the paid AI call when the limit cannot be checked', async () => {
    status = 'unknown'
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(create).not.toHaveBeenCalled()
    expect((await res.json()).contentMatches).toHaveLength(1)
  })

  it('calls the model normally when allowed', async () => {
    status = 'allowed'
    create.mockResolvedValue({ content: [{ type: 'text', text: '{"answer":"a","answerType":"hybrid","relevantSlugs":[],"relatedQuestions":[]}' }] })
    await GET(req())
    expect(create).toHaveBeenCalledTimes(1)
  })
})
