import { describe, it, expect } from 'vitest'
import {
  computeImportParityGoldINR,
  computeImportParitySilverINR,
  computeImportParityCrudeINR,
  computeImportParityCopperINR,
  computeSpreadPct,
  computeGoldSilverRatio,
  checkParityWedge,
} from './parity.mjs'

describe('computeImportParityGoldINR', () => {
  it('converts USD/troy-oz to INR/10g', () => {
    // 3400 USD/oz * (10/31.1035) * 88 USDINR ≈ 96,196
    const result = computeImportParityGoldINR(3400, 88)
    expect(result).toBeGreaterThan(96000)
    expect(result).toBeLessThan(96400)
  })

  it('returns 0 for non-positive inputs', () => {
    expect(computeImportParityGoldINR(0, 88)).toBe(0)
    expect(computeImportParityGoldINR(3400, 0)).toBe(0)
    expect(computeImportParityGoldINR(-1, 88)).toBe(0)
  })
})

describe('computeImportParitySilverINR', () => {
  it('converts USD/troy-oz to INR/kg (x1000, not x10 — different unit than gold)', () => {
    // 38 USD/oz * (1000/31.1035) * 88 USDINR ≈ 107,512
    const result = computeImportParitySilverINR(38, 88)
    expect(result).toBeGreaterThan(107300)
    expect(result).toBeLessThan(107700)
  })

  it('returns 0 for non-positive inputs', () => {
    expect(computeImportParitySilverINR(0, 88)).toBe(0)
  })
})

describe('computeSpreadPct', () => {
  it('computes % spread of MCX price above import parity', () => {
    expect(computeSpreadPct(110, 100)).toBe(10)
    expect(computeSpreadPct(90, 100)).toBe(-10)
  })

  it('returns 0 when either input is non-positive', () => {
    expect(computeSpreadPct(0, 100)).toBe(0)
    expect(computeSpreadPct(110, 0)).toBe(0)
  })
})

describe('computeGoldSilverRatio', () => {
  it('divides gold by silver price', () => {
    expect(computeGoldSilverRatio(3400, 40)).toBe(85)
  })
})

describe('computeImportParityCrudeINR', () => {
  it('converts WTI USD/barrel to INR/barrel (direct product)', () => {
    // 80 USD/bbl * 84 USDINR = 6720 INR/bbl
    expect(computeImportParityCrudeINR(80, 84)).toBe(6720)
  })

  it('returns 0 for non-positive inputs', () => {
    expect(computeImportParityCrudeINR(0, 84)).toBe(0)
    expect(computeImportParityCrudeINR(80, 0)).toBe(0)
  })
})

describe('computeImportParityCopperINR', () => {
  it('converts COMEX cents/lb to INR/kg', () => {
    // 450 cents/lb = 4.50 USD/lb; × 2.20462 = 9.921 USD/kg; × 84 = ~833 INR/kg
    const result = computeImportParityCopperINR(450, 84)
    expect(result).toBeGreaterThan(830)
    expect(result).toBeLessThan(840)
  })

  it('returns 0 for non-positive inputs', () => {
    expect(computeImportParityCopperINR(0, 84)).toBe(0)
    expect(computeImportParityCopperINR(450, 0)).toBe(0)
  })
})

describe('checkParityWedge', () => {
  it('returns null when spreads are within tolerance', () => {
    expect(checkParityWedge(13.3, 14.5, 2)).toBeNull()
  })

  it('flags a wedge exceeding tolerance', () => {
    const result = checkParityWedge(13.31, 23.95, 2)
    expect(result).not.toBeNull()
    expect(result.type).toBe('PARITY_WEDGE_DIVERGENCE')
    expect(result.deltaPts).toBeCloseTo(10.64, 1)
  })

  it('returns null when either spread is exactly 0 (treated as unavailable, not a real 0% spread)', () => {
    expect(checkParityWedge(0, 14.5, 2)).toBeNull()
  })
})
