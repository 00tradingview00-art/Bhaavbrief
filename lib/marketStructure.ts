/**
 * lib/marketStructure.ts — reader for data/market-structure.json
 *
 * Only scripts/sync-market-prices.mjs (live contractValue/typicalMargin/expiryNote,
 * every ~30 min) and scripts/site-guardian.mjs (static narrative fields, weekly
 * DEEP_AUDIT) may WRITE this data. The committed file remains a valid template for
 * the static fields (name, mcxSymbol, unit, lotSize, tickSize, importParity,
 * supplyControl, keyBodies, demandDrivers, priceDrivers, keyRisk, taxNote,
 * macroLinks) even once sync-market-prices.mjs stops being committed on every
 * run — that script only ever overlays 2-3 live-price-derived strings on top of
 * whatever it reads. Redis first for those live fields; same never-throws
 * contract as lib/snapshot.ts's loadSnapshot().
 */

import fs from 'fs'
import path from 'path'
import { redisCommand } from './redis'

const REDIS_STRUCTURE_KEY = 'market-structure:latest'

export interface CommodityStructureEntry {
  name: string
  mcxSymbol: string
  unit: string
  lotSize: string
  tickSize: string
  typicalMargin: string
  contractValue: string
  importParity: string
  supplyControl: string
  keyBodies: string[]
  demandDrivers: string[]
  priceDrivers: string[]
  keyRisk: string
  taxNote: string
  macroLinks: string[]
  expiryNote?: string
}

export type MarketStructure = Record<string, CommodityStructureEntry>

export async function loadMarketStructure(): Promise<MarketStructure | null> {
  try {
    const cached = await redisCommand('GET', REDIS_STRUCTURE_KEY)
    if (cached && typeof cached === 'string') return JSON.parse(cached) as MarketStructure
  } catch { /* fall through to file */ }
  try {
    const file = path.join(process.cwd(), 'data/market-structure.json')
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8')) as MarketStructure
  } catch { return null }
}
