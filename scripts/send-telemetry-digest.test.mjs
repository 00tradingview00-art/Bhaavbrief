import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildDigest, readGateLog } from './send-telemetry-digest.mjs'

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

describe('readGateLog', () => {
  it('ignores fixture rows the test suite once wrote into the real log', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-digest-'))
    const file = path.join(dir, 'gate-log.jsonl')
    const now = new Date().toISOString()
    fs.writeFileSync(file, [
      { type: 'gate_run', briefPath: 'content/briefs/edition-117.mdx', clean: false, checkedAt: now },
      { type: 'gate_run', briefPath: '/var/folders/_q/x/T/validate-brief-test-abc/brief.mdx', hasInternalError: true, checkedAt: now },
      { type: 'generation_call', checkedAt: now },
    ].map(r => JSON.stringify(r)).join('\n') + '\n')
    try {
      expect(readGateLog(file).map(r => r.briefPath)).toEqual(['content/briefs/edition-117.mdx'])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
