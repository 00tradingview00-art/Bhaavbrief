import { describe, test, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import { loadMarketStructure, type MarketStructure } from './marketStructure'
import * as redisModule from './redis'

afterEach(() => {
  vi.restoreAllMocks()
})

function makeStructure(): MarketStructure {
  return {
    gold: {
      name: 'Gold', mcxSymbol: 'GOLD', unit: '10g', lotSize: '1000g', tickSize: '₹1',
      typicalMargin: '₹7.0–9.8 lakh', contractValue: '~₹1.4 crore at ₹1,40,473/10g',
      importParity: 'COMEX + duty', supplyControl: 'RBI + imports', keyBodies: ['RBI'],
      demandDrivers: ['Jewellery'], priceDrivers: ['USD/INR'], keyRisk: 'Import duty changes',
      taxNote: 'GST 3%', macroLinks: ['USDINR'], expiryNote: 'Front-month contract expires 5 Dec 2026',
    },
  }
}

describe('loadMarketStructure', () => {
  // No UPSTASH_REDIS_REST_URL/TOKEN set in the test env, so redisCommand()
  // throws "not configured" and loadMarketStructure() falls through to the
  // file path on every one of these — exercising exactly the fallback
  // behavior real local/preview environments hit before Redis is ever
  // written to (same contract as lib/snapshot.ts's loadSnapshot()).
  test('returns the parsed structure when the file exists and is valid JSON', async () => {
    const structure = makeStructure()
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(structure))
    expect(await loadMarketStructure()).toEqual(structure)
  })

  test('returns null when the file does not exist', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    expect(await loadMarketStructure()).toBeNull()
  })

  test('returns null instead of throwing on malformed JSON', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{not valid json')
    expect(await loadMarketStructure()).toBeNull()
  })

  test('reads from Redis when available, without touching the file', async () => {
    const structure = makeStructure()
    const existsSync = vi.spyOn(fs, 'existsSync')
    vi.spyOn(redisModule, 'redisCommand').mockResolvedValue(JSON.stringify(structure))
    expect(await loadMarketStructure()).toEqual(structure)
    expect(existsSync).not.toHaveBeenCalled()
  })

  test('falls back to the file when the Redis read fails', async () => {
    const structure = makeStructure()
    vi.spyOn(redisModule, 'redisCommand').mockRejectedValue(new Error('Redis not configured'))
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(structure))
    expect(await loadMarketStructure()).toEqual(structure)
  })
})
