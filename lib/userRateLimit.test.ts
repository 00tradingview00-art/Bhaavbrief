import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./redis', () => ({ redisCommand: vi.fn() }))

import { redisCommand } from './redis'
import { incrementWindow } from './userRateLimit'

const mockRedis = vi.mocked(redisCommand)

beforeEach(() => vi.clearAllMocks())

describe('incrementWindow', () => {
  it('creates the key with its TTL before incrementing', async () => {
    mockRedis.mockResolvedValueOnce('OK').mockResolvedValueOnce(1)
    expect(await incrementWindow('rl:cancel:u1', 3600)).toBe(1)
    expect(mockRedis.mock.calls).toEqual([
      ['SET', 'rl:cancel:u1', '0', 'EX', '3600', 'NX'],
      ['INCR', 'rl:cancel:u1'],
    ])
  })

  it('never issues a separate EXPIRE that could fail and leave the key without a TTL', async () => {
    mockRedis.mockResolvedValueOnce(null).mockResolvedValueOnce(4)
    expect(await incrementWindow('rl:cancel:u1', 3600)).toBe(4)
    expect(mockRedis.mock.calls.map(c => c[0])).not.toContain('EXPIRE')
  })
})
