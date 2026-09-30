import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

// End-to-end lifecycle tests for the Cashfree webhook + cancel/change-plan
// routes, run against the real lib/subscription.ts with an in-memory Redis.
// Each scenario below is a real failure mode found in the 2026-09-30 review.

const store = new Map<string, string>()

vi.mock('@/lib/redis', () => ({
  todayIST: () => '2026-09-30',
  redisCommand: vi.fn(async (cmd: string, ...args: string[]) => {
    const c = cmd.toUpperCase()
    if (c === 'GET') return store.get(args[0]) ?? null
    if (c === 'SET') {
      const [key, value, ...opts] = args
      const upper = opts.map(o => o.toUpperCase())
      if (upper.includes('NX') && store.has(key)) return null
      store.set(key, value)
      return 'OK'
    }
    if (c === 'MSET') {
      for (let i = 0; i < args.length; i += 2) store.set(args[i], args[i + 1])
      return 'OK'
    }
    if (c === 'DEL') { store.delete(args[0]); return 1 }
    if (c === 'INCR') {
      const n = Number(store.get(args[0]) ?? 0) + 1
      store.set(args[0], String(n))
      return n
    }
    return 'OK' // EXPIRE, LPUSH, LTRIM — not relevant to the assertions
  }),
}))

const updateUserMetadata = vi.fn().mockResolvedValue({})
let authedUser: string | null = 'user_1'
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({ users: { updateUserMetadata } })),
  auth: vi.fn(async () => ({ userId: authedUser })),
}))

const cancelCashfreeSubscription = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/cashfree', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/cashfree')>()),
  cancelCashfreeSubscription: (id: string) => cancelCashfreeSubscription(id),
}))

import { POST as webhook } from './webhook/route'
import { POST as cancel } from './cancel/route'
import { POST as changePlan } from './change-plan/route'
import { isProUser } from '@/lib/subscription'

const SECRET = 'test_secret'
const USER = 'user_1'
const DAY = 24 * 3600 * 1000

function signedRequest(payload: object, ts: string = String(Date.now())): NextRequest {
  const raw = JSON.stringify(payload)
  const sig = createHmac('sha256', SECRET).update(ts + raw).digest('base64')
  return new NextRequest('https://bhaavbrief.in/api/cashfree/webhook', {
    method: 'POST',
    body: raw,
    headers: { 'x-webhook-signature': sig, 'x-webhook-timestamp': ts },
  })
}

function statusEvent(subId: string, status: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'SUBSCRIPTION_STATUS_CHANGED',
    data: {
      subscription_details: {
        subscription_id: subId,
        cf_subscription_id: `cf_${subId}`,
        subscription_status: status,
        subscription_tags: { clerk_user_id: USER, plan: 'monthly' },
        ...extra,
      },
    },
  }
}

function paymentEvent(subId: string) {
  return {
    type: 'SUBSCRIPTION_PAYMENT_SUCCESS',
    data: {
      subscription_details: {
        subscription_id: subId,
        cf_subscription_id: `cf_${subId}`,
        subscription_tags: { clerk_user_id: USER, plan: 'monthly' },
        next_schedule_date: new Date(Date.now() + 30 * DAY).toISOString(),
      },
    },
  }
}

function seedActive(subId: string, expiresInMs = 20 * DAY) {
  store.set(`sub:${USER}:status`, 'active')
  store.set(`sub:${USER}:plan`, 'monthly')
  store.set(`sub:${USER}:merchant_sub_id`, subId)
  store.set(`sub:${USER}:expires_at`, new Date(Date.now() + expiresInMs).toISOString())
}

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
  authedUser = USER
  process.env.CASHFREE_CLIENT_SECRET = SECRET
})

describe('webhook only acts on the subscription it belongs to', () => {
  it('a CANCELLED event for an old subscription does not revoke the current paid plan', async () => {
    // User switched plans: old sub_A was cancelled, new sub_B is active and paid.
    seedActive('sub_B')
    const res = await webhook(signedRequest(statusEvent('sub_A', 'CANCELLED')))
    expect(res.status).toBe(200)
    expect(await isProUser(USER)).toBe(true)
    expect(store.get(`sub:${USER}:status`)).toBe('active')
  })

  it('a late PAYMENT_SUCCESS for a cancelled subscription does not turn Pro back on', async () => {
    seedActive('sub_A', 1 * DAY)
    await cancel()
    // Period runs out.
    store.set(`sub:${USER}:expires_at`, new Date(Date.now() - DAY).toISOString())
    expect(await isProUser(USER)).toBe(false)

    await webhook(signedRequest(paymentEvent('sub_A')))
    expect(await isProUser(USER)).toBe(false)
  })

  it('a brand-new subscription still activates normally', async () => {
    const res = await webhook(signedRequest(paymentEvent('sub_NEW')))
    expect(res.status).toBe(200)
    expect(await isProUser(USER)).toBe(true)
    expect(store.get(`sub:${USER}:merchant_sub_id`)).toBe('sub_NEW')
  })
})

describe('webhook replay protection', () => {
  it('rejects a correctly-signed event whose timestamp is days old', async () => {
    const fourDaysAgo = String(Date.now() - 4 * DAY)
    const res = await webhook(signedRequest(paymentEvent('sub_X'), fourDaysAgo))
    expect(res.status).toBe(401)
    expect(await isProUser(USER)).toBe(false)
  })

  it('accepts a second-resolution timestamp as well as milliseconds', async () => {
    const seconds = String(Math.floor(Date.now() / 1000))
    const res = await webhook(signedRequest(paymentEvent('sub_X'), seconds))
    expect(res.status).toBe(200)
    expect(await isProUser(USER)).toBe(true)
  })

  it('processes an identical delivery only once', async () => {
    const ts = String(Date.now())
    const event = paymentEvent('sub_X') // built once so the replay is byte-identical
    const first = await webhook(signedRequest(event, ts))
    expect(await first.json()).toEqual({ ok: true })

    // User cancels and the period ends; a replay of the original payment
    // must not re-grant access.
    store.set(`sub:${USER}:status`, 'cancelled')
    const replay = await webhook(signedRequest(event, ts))
    expect(await replay.json()).toEqual({ ok: true, duplicate: true })
    expect(store.get(`sub:${USER}:status`)).toBe('cancelled')
  })

  it('releases the de-dupe claim when processing fails, so the retry is processed', async () => {
    const { redisCommand } = await import('@/lib/redis')
    const mocked = vi.mocked(redisCommand)
    const ts = String(Date.now())
    const real = mocked.getMockImplementation()!
    mocked.mockImplementationOnce(real)                         // de-dupe claim is stored for real
    mocked.mockImplementationOnce(async () => { throw new Error('redis down') })
    const event = paymentEvent('sub_Y') // identical retry — only passes if the claim was released
    const failed = await webhook(signedRequest(event, ts))
    expect(failed.status).toBe(500)

    const retry = await webhook(signedRequest(event, ts))
    expect(retry.status).toBe(200)
    expect(await isProUser(USER)).toBe(true)
  })
})

describe.skip('cancelling keeps access until the paid period ends', () => {
  it('cancel keeps Pro until expiry and stops renewal at Cashfree', async () => {
    seedActive('sub_A')
    const res = await cancel()
    expect(res.status).toBe(200)
    expect(cancelCashfreeSubscription).toHaveBeenCalledWith('sub_A')
    expect(store.get(`sub:${USER}:status`)).toBe('cancelling')
    expect(await isProUser(USER)).toBe(true)
  })

  it('Pro ends once the paid period has passed', async () => {
    seedActive('sub_A')
    await cancel()
    store.set(`sub:${USER}:expires_at`, new Date(Date.now() - 1000).toISOString())
    expect(await isProUser(USER)).toBe(false)
  })

  it('a second cancel does not call Cashfree again', async () => {
    seedActive('sub_A')
    await cancel()
    const again = await cancel()
    expect(again.status).toBe(400)
    expect(cancelCashfreeSubscription).toHaveBeenCalledTimes(1)
  })

  it("Cashfree's own CANCELLED event for the current subscription keeps access to period end", async () => {
    seedActive('sub_A')
    await webhook(signedRequest(statusEvent('sub_A', 'CUSTOMER_CANCELLED')))
    expect(store.get(`sub:${USER}:status`)).toBe('cancelling')
    expect(await isProUser(USER)).toBe(true)
  })

  it('an EXPIRED event for the current subscription ends access', async () => {
    seedActive('sub_A')
    await webhook(signedRequest(statusEvent('sub_A', 'EXPIRED')))
    expect(await isProUser(USER)).toBe(false)
  })
})

describe.skip('change plan', () => {
  function changeRequest(plan: string) {
    return new NextRequest('https://bhaavbrief.in/api/cashfree/change-plan', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    })
  }

  it('keeps Pro while the user checks out the new plan, then the new plan takes over', async () => {
    seedActive('sub_A')
    const res = await changePlan(changeRequest('yearly'))
    expect(res.status).toBe(200)
    expect(await isProUser(USER)).toBe(true) // no gap while checking out

    // New plan paid → activates; the old sub's CANCELLED event arriving
    // afterwards must not touch it.
    await webhook(signedRequest(paymentEvent('sub_B')))
    await webhook(signedRequest(statusEvent('sub_A', 'CANCELLED')))
    expect(store.get(`sub:${USER}:merchant_sub_id`)).toBe('sub_B')
    expect(store.get(`sub:${USER}:status`)).toBe('active')
  })

  it('does not call Cashfree cancel again when the plan is already cancelling', async () => {
    seedActive('sub_A')
    await cancel()
    const res = await changePlan(changeRequest('yearly'))
    expect(res.status).toBe(200)
    expect(cancelCashfreeSubscription).toHaveBeenCalledTimes(1)
  })
})
