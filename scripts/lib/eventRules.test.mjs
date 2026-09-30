import { describe, it, expect } from 'vitest'
import { applyComputedDates } from './eventRules.mjs'

const now = new Date('2026-09-30T06:00:00Z') // Wed

describe('applyComputedDates', () => {
  it('rolls a past weekly event to its next occurrence', () => {
    const [api] = applyComputedDates(
      [{ id: 'api_crude_inventories', cadence_type: 'rule_based', next_release_utc: '2026-09-29T20:30:00.000Z' }],
      now, null,
    )
    expect(api.next_release_utc).toBe('2026-10-06T20:30:00.000Z') // next Tue
  })

  it('leaves an upcoming weekly event alone', () => {
    const e = { id: 'eia_natural_gas_storage', cadence_type: 'rule_based', next_release_utc: '2026-10-01T14:30:00.000Z' }
    expect(applyComputedDates([e], now, null)[0]).toBe(e)
  })

  it('takes MCX expiry dates from the live front-month contracts', () => {
    const [gold, silver] = applyComputedDates(
      [
        { id: 'mcx_expiry_gold', cadence_type: 'mcx_expiry', next_release_utc: '2026-08-05T17:55:00Z' },
        { id: 'mcx_expiry_silver', cadence_type: 'mcx_expiry', next_release_utc: '2026-09-04T17:55:00Z' },
      ],
      now,
      { gold: { expiry: '2026-10-05' }, silver: { expiry: '2026-12-04' } },
    )
    expect(gold.next_release_utc).toBe('2026-10-05T17:55:00Z')
    expect(silver.next_release_utc).toBe('2026-12-04T17:55:00Z')
  })

  it('keeps an expiry event unchanged when the contract file lacks it', () => {
    const e = { id: 'mcx_expiry_nickel', cadence_type: 'mcx_expiry', next_release_utc: '2026-07-15T17:55:00Z' }
    expect(applyComputedDates([e], now, {})[0]).toBe(e)
  })

  it('never touches manual events', () => {
    const e = { id: 'us_cpi', cadence_type: 'manual', next_release_utc: '2026-09-11T12:30:00Z' }
    expect(applyComputedDates([e], now, { gold: { expiry: '2026-10-05' } })[0]).toBe(e)
  })
})
