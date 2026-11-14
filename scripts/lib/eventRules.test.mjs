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

  it('rolls a past daily event to the next day it fires', () => {
    const e = { id: 'noaa_weather_outlook', cadence_type: 'rule_based', next_release_utc: '2026-07-10T12:00:00Z' }
    expect(applyComputedDates([e], now, null)[0].next_release_utc).toBe('2026-09-30T20:00:00.000Z') // same day, later
    expect(applyComputedDates([e], new Date('2026-09-30T21:00:00Z'), null)[0].next_release_utc)
      .toBe('2026-10-01T20:00:00.000Z') // already out today → tomorrow
  })

  it('resolves EIA/API US/Eastern-anchored rules to the EDT offset while US daylight saving is in effect', () => {
    const [api] = applyComputedDates(
      [{ id: 'api_crude_inventories', cadence_type: 'rule_based', next_release_utc: '2026-09-29T20:30:00.000Z' }],
      now, null, // now = 2026-09-30, still EDT
    )
    expect(api.next_release_utc).toBe('2026-10-06T20:30:00.000Z') // Tue, 4:30pm ET = 20:30 UTC under EDT
  })

  it('resolves EIA/API US/Eastern-anchored rules to the EST offset once US daylight saving ends (the actual bug both audits found)', () => {
    const winterNow = new Date('2026-11-09T06:00:00Z') // Monday, after DST ended 1 Nov 2026
    const [gas] = applyComputedDates(
      [{ id: 'eia_natural_gas_storage', cadence_type: 'rule_based', next_release_utc: '2026-11-05T14:30:00.000Z' }],
      winterNow, null,
    )
    expect(gas.next_release_utc).toBe('2026-11-12T15:30:00.000Z') // Thu, 10:30am ET = 15:30 UTC under EST, not 14:30
    const [api] = applyComputedDates(
      [{ id: 'api_crude_inventories', cadence_type: 'rule_based', next_release_utc: '2026-11-03T20:30:00.000Z' }],
      winterNow, null,
    )
    expect(api.next_release_utc).toBe('2026-11-10T21:30:00.000Z') // Tue, 4:30pm ET = 21:30 UTC under EST, not 20:30
  })

  it('resolves the DST status of the target date, not the run date, across the EDT→EST changeover week', () => {
    // `now` (30 Oct) is still EDT, but the next Thursday occurrence (5 Nov)
    // falls after DST ends (1 Nov) — the result must use EST (15:30 UTC),
    // not the 14:30 UTC that `now`'s own DST status would suggest.
    const e = { id: 'eia_natural_gas_storage', cadence_type: 'rule_based', next_release_utc: '2026-10-29T14:30:00.000Z' }
    expect(applyComputedDates([e], new Date('2026-10-30T06:00:00Z'), null)[0].next_release_utc)
      .toBe('2026-11-05T15:30:00.000Z')
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
