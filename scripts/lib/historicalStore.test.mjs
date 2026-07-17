import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { appendDailySnapshot, readDailySnapshot, historyFilePath } from './historicalStore.mjs'

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-history-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('appendDailySnapshot / readDailySnapshot', () => {
  it('writes and reads back a snapshot for a given IST date', () => {
    const snap = { generatedAt: '2026-07-18T00:00:00Z', instruments: { MCX_GOLD: { price: 141006 } } }
    appendDailySnapshot(tmpDir, '2026-07-18', snap)
    const readBack = readDailySnapshot(tmpDir, '2026-07-18')
    expect(readBack).toEqual(snap)
  })

  it('overwrites the same day when called again (latest-of-day semantics)', () => {
    appendDailySnapshot(tmpDir, '2026-07-18', { instruments: { MCX_GOLD: { price: 100 } } })
    appendDailySnapshot(tmpDir, '2026-07-18', { instruments: { MCX_GOLD: { price: 200 } } })
    const readBack = readDailySnapshot(tmpDir, '2026-07-18')
    expect(readBack.instruments.MCX_GOLD.price).toBe(200)
  })

  it('does not touch a prior day\'s file when a new day is written', () => {
    appendDailySnapshot(tmpDir, '2026-07-17', { instruments: { MCX_GOLD: { price: 100 } } })
    appendDailySnapshot(tmpDir, '2026-07-18', { instruments: { MCX_GOLD: { price: 200 } } })
    expect(readDailySnapshot(tmpDir, '2026-07-17').instruments.MCX_GOLD.price).toBe(100)
    expect(readDailySnapshot(tmpDir, '2026-07-18').instruments.MCX_GOLD.price).toBe(200)
  })

  it('returns null for a date with no archived snapshot', () => {
    expect(readDailySnapshot(tmpDir, '2020-01-01')).toBeNull()
  })

  it('creates the history directory if it does not exist yet', () => {
    const nested = path.join(tmpDir, 'nested', 'history')
    expect(fs.existsSync(nested)).toBe(false)
    appendDailySnapshot(nested, '2026-07-18', { a: 1 })
    expect(fs.existsSync(historyFilePath(nested, '2026-07-18'))).toBe(true)
  })
})
