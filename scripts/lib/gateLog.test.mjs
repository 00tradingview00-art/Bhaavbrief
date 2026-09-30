import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { appendGateLogEntry, hashPayload } from './gateLog.mjs'

describe('hashPayload', () => {
  it('is deterministic for the same input', () => {
    expect(hashPayload('same text')).toBe(hashPayload('same text'))
  })

  it('differs for different input', () => {
    expect(hashPayload('text A')).not.toBe(hashPayload('text B'))
  })
})

describe('appendGateLogEntry', () => {
  let tmpDir
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-gatelog-test-'))
    fs.mkdirSync(path.join(tmpDir, 'data'))
  })
  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }))

  it('appends a JSON line to data/gate-log.jsonl', () => {
    appendGateLogEntry({ type: 'generation_call', model: 'test' }, tmpDir)
    const content = fs.readFileSync(path.join(tmpDir, 'data/gate-log.jsonl'), 'utf8')
    const parsed = JSON.parse(content.trim())
    expect(parsed).toEqual({ type: 'generation_call', model: 'test' })
  })

  it('appends multiple entries as separate lines', () => {
    appendGateLogEntry({ type: 'a' }, tmpDir)
    appendGateLogEntry({ type: 'b' }, tmpDir)
    const lines = fs.readFileSync(path.join(tmpDir, 'data/gate-log.jsonl'), 'utf8').trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0]).type).toBe('a')
    expect(JSON.parse(lines[1]).type).toBe('b')
  })

  it('writes to GATE_LOG_PATH instead when set (keeps test runs out of the real log)', () => {
    const redirected = path.join(tmpDir, 'elsewhere.jsonl')
    process.env.GATE_LOG_PATH = redirected
    try {
      appendGateLogEntry({ type: 'gate_run' }, tmpDir)
    } finally {
      delete process.env.GATE_LOG_PATH
    }
    expect(JSON.parse(fs.readFileSync(redirected, 'utf8').trim())).toEqual({ type: 'gate_run' })
    expect(fs.existsSync(path.join(tmpDir, 'data/gate-log.jsonl'))).toBe(false)
  })
})
