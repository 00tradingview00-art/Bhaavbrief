import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock redisCommand before importing subscription
vi.mock('./redis', () => ({
  redisCommand: vi.fn(),
}))

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn().mockResolvedValue({
    users: { updateUserMetadata: vi.fn().mockResolvedValue({}) },
  }),
}))

import { redisCommand } from './redis'
import { isProUser, activateSubscription, deactivateSubscription } from './subscription'

const mockRedis = vi.mocked(redisCommand)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isProUser', () => {
  it('returns false for null userId', async () => {
    expect(await isProUser(null)).toBe(false)
    expect(mockRedis).not.toHaveBeenCalled()
  })

  it('returns true for active user with future expiry', async () => {
    const future = new Date(Date.now() + 86400_000).toISOString()
    mockRedis
      .mockResolvedValueOnce('active')  // GET sub:user1:status
      .mockResolvedValueOnce(future)    // GET sub:user1:expires_at
    expect(await isProUser('user1')).toBe(true)
  })

  it('returns false for cancelled user', async () => {
    mockRedis.mockResolvedValueOnce('cancelled')
    expect(await isProUser('user1')).toBe(false)
  })

  it('returns false for expired user (past expires_at)', async () => {
    const past = new Date(Date.now() - 86400_000).toISOString()
    mockRedis
      .mockResolvedValueOnce('active')
      .mockResolvedValueOnce(past)
    expect(await isProUser('user1')).toBe(false)
  })

  it('returns false when status is null (never subscribed)', async () => {
    mockRedis.mockResolvedValueOnce(null)
    expect(await isProUser('user1')).toBe(false)
  })
})

describe('activateSubscription', () => {
  it('writes all keys via MSET', async () => {
    mockRedis.mockResolvedValueOnce('OK')
    const expiry = new Date('2027-01-01T00:00:00Z')
    await activateSubscription('user1', 'sub_xyz', 'monthly', expiry)
    expect(mockRedis).toHaveBeenCalledWith(
      'MSET',
      'sub:user1:status', 'active',
      'sub:user1:plan', 'monthly',
      'sub:user1:razorpay_sub_id', 'sub_xyz',
      'sub:user1:expires_at', '2027-01-01T00:00:00.000Z',
    )
  })
})

describe('deactivateSubscription', () => {
  it('sets status to cancelled', async () => {
    mockRedis.mockResolvedValueOnce('OK')
    await deactivateSubscription('user1')
    expect(mockRedis).toHaveBeenCalledWith('SET', 'sub:user1:status', 'cancelled')
  })
})
