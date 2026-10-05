import { describe, it, expect } from 'vitest'
import { upcomingEvents, formatUpcomingEventsBlock } from './upcomingEvents.mjs'

const COT = {
  id: 'cftc_cot_report', name: 'CFTC Commitment of Traders (COT) Report',
  cadence_type: 'rule_based', next_release_utc: '2026-10-02T19:30:00.000Z', affected_contracts: ['gold'],
}
const EIA = {
  id: 'eia_crude_inventory', name: 'EIA Crude Inventory',
  cadence_type: 'manual', next_release_utc: '2026-10-07T14:30:00.000Z', affected_contracts: ['crude'],
}
const STALE_MANUAL = {
  id: 'opec_meeting', name: 'OPEC+ Meeting',
  cadence_type: 'manual', next_release_utc: '2026-09-01T10:00:00.000Z', affected_contracts: ['crude'],
}

// Monday 05 Oct 2026, 08:37 IST — when the brief that said "Tuesday" was written.
const NOW = new Date('2026-10-05T03:07:00Z')

describe('upcomingEvents', () => {
  it('rolls a past rule-based date forward to its real weekday (COT → Friday)', () => {
    const list = upcomingEvents([COT], NOW, null, '2026-10-06')
    expect(list).toHaveLength(1)
    expect(list[0].whenIST).toMatch(/^Saturday, 10 October/) // Fri 19:30 UTC = Sat 01:00 IST
  })

  it('lists every event up to the end of the next trading day, even beyond the minimum', () => {
    const list = upcomingEvents([COT, EIA], NOW, null, '2026-10-10', 1)
    expect(list.map(e => e.id)).toEqual(['eia_crude_inventory', 'cftc_cot_report'])
  })

  it('stops at the minimum when fewer events fall before the next session ends', () => {
    const list = upcomingEvents([COT, EIA], NOW, null, '2026-10-06', 1)
    expect(list.map(e => e.id)).toEqual(['eia_crude_inventory'])
  })

  it('never offers an event whose stored date has already passed', () => {
    const list = upcomingEvents([STALE_MANUAL, EIA], NOW, null, '2026-10-06')
    expect(list.map(e => e.id)).not.toContain('opec_meeting')
  })

  it('tops up with the nearest later events when few fall before the next session ends', () => {
    const list = upcomingEvents([COT, EIA], NOW, null, '2026-10-06')
    expect(list.map(e => e.id)).toEqual(['eia_crude_inventory', 'cftc_cot_report'])
  })

  it('writes an event later today as "today", never by today\'s weekday', () => {
    const tonight = { ...EIA, next_release_utc: '2026-10-05T14:30:00.000Z' } // Mon 8:00 pm IST
    const [ev] = upcomingEvents([tonight], NOW, null, '2026-10-06')
    expect(ev.whenIST).toMatch(/^today at 8:00 pm IST$/i)
    expect(ev.whenIST).not.toMatch(/Monday/)
  })

  it('formats an empty list explicitly', () => {
    expect(formatUpcomingEventsBlock([])).toMatch(/no scheduled events/)
  })
})
