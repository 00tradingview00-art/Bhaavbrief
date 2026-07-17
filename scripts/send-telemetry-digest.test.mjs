import { describe, it, expect } from 'vitest'
import { buildDigest } from './send-telemetry-digest.mjs'

describe('buildDigest', () => {
  it('reports n/a pass rate with zero gate runs', () => {
    const digest = buildDigest({ gateEntries: [], edgeLedger: null, incidents: null })
    expect(digest).toContain('pass rate: n/a (no runs)')
  })

  it('computes pass rate and flags internal errors', () => {
    const gateEntries = [
      { clean: true, hasInternalError: false },
      { clean: false, hasInternalError: false },
      { clean: false, hasInternalError: true },
    ]
    const digest = buildDigest({ gateEntries, edgeLedger: null, incidents: null })
    expect(digest).toContain('Gate runs: 3 · clean: 1 · pass rate: 33.3%')
    expect(digest).toContain('1 gate-internal failure(s)')
  })

  it('reports open incident count separately from total', () => {
    const incidents = [{ state: 'open' }, { state: 'closed' }, { state: 'open' }]
    const digest = buildDigest({ gateEntries: [], edgeLedger: null, incidents })
    expect(digest).toContain('Monitor incidents: 3 (2 still open)')
  })

  it('summarizes edge ledger results when present', () => {
    const edgeLedger = { entries: [{ result: 'confirmed' }, { result: 'confirmed' }, { result: 'rejected' }, { result: 'unresolved' }] }
    const digest = buildDigest({ gateEntries: [], edgeLedger, incidents: null })
    expect(digest).toContain('2 confirmed, 1 rejected, 1 unresolved')
  })
})
