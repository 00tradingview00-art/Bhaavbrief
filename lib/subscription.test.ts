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
import { isProUser, activateSubscription, deactivateSubscription, hasInternalAccess } from './subscription'

const mockRedis = vi.mocked(redisCommand)

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.INTERNAL_ACCESS_SECRET
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

describe('hasInternalAccess', () => {
  it('returns false when INTERNAL_ACCESS_SECRET is unset, even with a matching-looking header', () => {
    const headers = new Headers({ authorization: 'Bearer whatever' })
    expect(hasInternalAccess(headers)).toBe(false)
  })

  it('returns false when the header is missing', () => {
    process.env.INTERNAL_ACCESS_SECRET = 'top-secret'
    expect(hasInternalAccess(new Headers())).toBe(false)
  })

  it('returns false when the header value does not match the secret', () => {
    process.env.INTERNAL_ACCESS_SECRET = 'top-secret'
    const headers = new Headers({ authorization: 'Bearer wrong-value' })
    expect(hasInternalAccess(headers)).toBe(false)
  })

  it('returns true only for an exact "Bearer <secret>" match', () => {
    process.env.INTERNAL_ACCESS_SECRET = 'top-secret'
    const headers = new Headers({ authorization: 'Bearer top-secret' })
    expect(hasInternalAccess(headers)).toBe(true)
  })

  it('is case-sensitive / exact on the bearer value (no partial match)', () => {
    process.env.INTERNAL_ACCESS_SECRET = 'top-secret'
    const headers = new Headers({ authorization: 'Bearer top-secret-extra' })
    expect(hasInternalAccess(headers)).toBe(false)
  })
})

describe('activateSubscription', () => {
  it('writes all keys via MSET including provider', async () => {
    mockRedis.mockResolvedValueOnce('OK')
    const expiry = new Date('2027-01-01T00:00:00Z')
    await activateSubscription('user1', 'sub_xyz', 'monthly', expiry)
    expect(mockRedis).toHaveBeenCalledWith(
      'MSET',
      'sub:user1:status', 'active',
      'sub:user1:plan', 'monthly',
      'sub:user1:provider', 'cashfree',
      'sub:user1:provider_sub_id', 'sub_xyz',
      'sub:user1:expires_at', '2027-01-01T00:00:00.000Z',
    )
  })

  it('also writes merchant_sub_id when provided', async () => {
    mockRedis.mockResolvedValueOnce('OK')
    const expiry = new Date('2027-01-01T00:00:00Z')
    await activateSubscription('user1', 'cf_sub_xyz', 'monthly', expiry, 'bb_user1_monthly_123')
    expect(mockRedis).toHaveBeenCalledWith(
      'MSET',
      'sub:user1:status', 'active',
      'sub:user1:plan', 'monthly',
      'sub:user1:provider', 'cashfree',
      'sub:user1:provider_sub_id', 'cf_sub_xyz',
      'sub:user1:expires_at', '2027-01-01T00:00:00.000Z',
      'sub:user1:merchant_sub_id', 'bb_user1_monthly_123',
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
