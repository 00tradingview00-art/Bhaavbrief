import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./redis', () => ({ redisCommand: vi.fn() }))

import { redisCommand } from './redis'
import {
  watchEvent, unwatchEvent, getWatchedEventIds, getWatchers,
  getNotifyEmail, wasNotified, markNotified,
} from './alertSubscriptions'

const mockRedis = vi.mocked(redisCommand)

beforeEach(() => vi.clearAllMocks())

describe('watchEvent', () => {
  it('writes the user set, the reverse-index set, and caches the email, then expires the reverse index', async () => {
    mockRedis.mockResolvedValue(1)
    await watchEvent('user1', 'a@b.com', 'cftc-cot')
    const calls = mockRedis.mock.calls
    expect(calls).toContainEqual(['SADD', 'alerts:user1', 'cftc-cot'])
    expect(calls).toContainEqual(['SADD', 'alerts-watchers:cftc-cot', 'user1'])
    expect(calls).toContainEqual(['SET', 'alerts-email:user1', 'a@b.com'])
    expect(calls).toContainEqual(['EXPIRE', 'alerts-watchers:cftc-cot', String(30 * 24 * 60 * 60)])
  })
})

describe('unwatchEvent', () => {
  it('removes from both the user set and the reverse index', async () => {
    mockRedis.mockResolvedValue(1)
    await unwatchEvent('user1', 'cftc-cot')
    const calls = mockRedis.mock.calls
    expect(calls).toContainEqual(['SREM', 'alerts:user1', 'cftc-cot'])
    expect(calls).toContainEqual(['SREM', 'alerts-watchers:cftc-cot', 'user1'])
  })
})

describe('getWatchedEventIds / getWatchers', () => {
  it('returns the member list, or an empty array when Redis returns null', async () => {
    mockRedis.mockResolvedValueOnce(['a', 'b'])
    expect(await getWatchedEventIds('user1')).toEqual(['a', 'b'])
    mockRedis.mockResolvedValueOnce(null)
    expect(await getWatchers('cftc-cot')).toEqual([])
  })
})

describe('getNotifyEmail', () => {
  it('returns the cached email or null', async () => {
    mockRedis.mockResolvedValueOnce('a@b.com')
    expect(await getNotifyEmail('user1')).toBe('a@b.com')
  })
})

describe('wasNotified / markNotified', () => {
  it('reflects SISMEMBER truthiness correctly (1 → true, 0 → false)', async () => {
    mockRedis.mockResolvedValueOnce(1)
    expect(await wasNotified('cftc-cot', 'user1')).toBe(true)
    mockRedis.mockResolvedValueOnce(0)
    expect(await wasNotified('cftc-cot', 'user1')).toBe(false)
  })

  it('markNotified adds to the sent set and sets a TTL', async () => {
    mockRedis.mockResolvedValue(1)
    await markNotified('cftc-cot', 'user1')
    const calls = mockRedis.mock.calls
    expect(calls).toContainEqual(['SADD', 'alerts-sent:cftc-cot', 'user1'])
    expect(calls).toContainEqual(['EXPIRE', 'alerts-sent:cftc-cot', String(30 * 24 * 60 * 60)])
  })
})
