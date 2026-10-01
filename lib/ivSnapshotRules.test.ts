import { describe, it, expect } from 'vitest'
import { snapshotExpiry, implausibleIVReason } from './ivSnapshotRules'

describe('snapshotExpiry', () => {
  const expiries = ['2026-10-26', '2026-09-25', '2026-11-25']

  it('skips an expiry on the session day itself', () => {
    expect(snapshotExpiry(expiries, '2026-09-25')).toBe('2026-10-26')
  })

  it('skips an expiry one day away', () => {
    expect(snapshotExpiry(expiries, '2026-09-24')).toBe('2026-10-26')
  })

  it('keeps the nearest expiry when it has 2+ days left', () => {
    expect(snapshotExpiry(expiries, '2026-09-23')).toBe('2026-09-25')
  })

  it('returns null when no expiry qualifies', () => {
    expect(snapshotExpiry(['2026-09-25'], '2026-09-25')).toBeNull()
  })
})

describe('implausibleIVReason', () => {
  const normal = [22, 24, 25, 23, 26, 24]

  it('accepts a normal reading', () => {
    expect(implausibleIVReason(24.5, normal)).toBeNull()
  })

  it('rejects the corrupt near-zero values seen live', () => {
    for (const bad of [1.17, 0.45, 0.21, 0.86, 4.41]) {
      expect(implausibleIVReason(bad, normal)).toMatch(/floor/)
    }
  })

  it('rejects a reading more than 3× the trailing median', () => {
    expect(implausibleIVReason(80, normal)).toMatch(/trailing median/)
  })

  it('rejects a collapse below a third of the trailing median (NATURALGAS 8.65 vs ~47)', () => {
    expect(implausibleIVReason(8.65, [45, 47, 48, 46, 50, 44])).toMatch(/trailing median/)
  })

  it('does not apply the median test with too little history', () => {
    expect(implausibleIVReason(80, [22, 24])).toBeNull()
  })

  it('rejects non-finite values', () => {
    expect(implausibleIVReason(NaN, normal)).not.toBeNull()
  })
})
