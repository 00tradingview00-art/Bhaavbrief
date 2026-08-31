import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'
import {
  planFromCashfreePlanId,
  planAmountInr,
  verifyCashfreeWebhookSignature,
  expiryFromPlan,
} from './cashfree'

describe('planFromCashfreePlanId', () => {
  const prev = { ...process.env }
  beforeEach(() => {
    process.env.CASHFREE_PLAN_ID_DAILY = 'Prabal_33'
    process.env.CASHFREE_PLAN_ID_MONTHLY = 'Prabal_333'
    process.env.CASHFREE_PLAN_ID_YEARLY = 'Prabal_2999'
  })
  afterEach(() => {
    process.env = { ...prev }
  })

  it('maps Prabal plan ids', () => {
    expect(planFromCashfreePlanId('Prabal_33')).toBe('daily')
    expect(planFromCashfreePlanId('Prabal_333')).toBe('monthly')
    expect(planFromCashfreePlanId('Prabal_2999')).toBe('yearly')
  })
})

describe('planAmountInr', () => {
  it('matches published Pro prices', () => {
    expect(planAmountInr('daily')).toBe(33)
    expect(planAmountInr('monthly')).toBe(333)
    expect(planAmountInr('yearly')).toBe(2999)
  })
})

describe('verifyCashfreeWebhookSignature', () => {
  const prev = { ...process.env }
  beforeEach(() => {
    process.env.CASHFREE_WEBHOOK_SECRET = 'test_secret'
  })
  afterEach(() => {
    process.env = { ...prev }
  })

  it('accepts valid HMAC', () => {
    const raw = Buffer.from('{"type":"SUBSCRIPTION_STATUS_CHANGED"}')
    const ts = '1710000000'
    const sig = createHmac('sha256', 'test_secret')
      .update(ts + raw.toString('utf8'))
      .digest('base64')
    expect(verifyCashfreeWebhookSignature(raw, sig, ts)).toBe(true)
  })

  it('rejects bad signature', () => {
    const raw = Buffer.from('{"type":"SUBSCRIPTION_STATUS_CHANGED"}')
    expect(verifyCashfreeWebhookSignature(raw, 'nope', '1710000000')).toBe(false)
  })
})

describe('expiryFromPlan', () => {
  it('adds roughly one period', () => {
    const from = new Date('2026-08-31T00:00:00Z')
    const daily = expiryFromPlan('daily', from)
    expect(daily.getTime() - from.getTime()).toBe(24 * 3600 * 1000)
  })
})
