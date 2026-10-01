import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, test } from 'vitest'
import { dutyInclusiveParity, loadDutyFactors } from './importDuty'

function tempConstants(content: string): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'duty-')), 'constants.json')
  fs.writeFileSync(file, content)
  return file
}

describe('loadDutyFactors', () => {
  test('reads the real constants file, using the effective factor for gold', () => {
    const consts = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'commodity-constants.json'), 'utf-8'))
    expect(loadDutyFactors()).toEqual({
      gold: consts.gold.importDutyFactorEffective,
      silver: consts.silver.importDutyFactor,
      crude: consts.crude.importDutyFactor,
    })
  })

  test('leaves out missing or invalid factors', () => {
    const file = tempConstants(JSON.stringify({ gold: { importDutyFactorEffective: 0 }, silver: { importDutyFactor: 'x' }, crude: { importDutyFactor: 1.025 } }))
    expect(loadDutyFactors(file)).toEqual({ crude: 1.025 })
  })

  test('returns nothing when the file is unreadable', () => {
    expect(loadDutyFactors('/nonexistent/constants.json')).toEqual({})
    expect(loadDutyFactors(tempConstants('{not json'))).toEqual({})
  })
})

describe('dutyInclusiveParity', () => {
  test('applies the factor without rounding', () => {
    expect(dutyInclusiveParity(100_000, 1.12)).toBeCloseTo(112_000, 6)
  })

  test('returns null instead of a price when an input is missing', () => {
    expect(dutyInclusiveParity(0, 1.12)).toBeNull()
    expect(dutyInclusiveParity(null, 1.12)).toBeNull()
    expect(dutyInclusiveParity(100_000, undefined)).toBeNull()
    expect(dutyInclusiveParity(100_000, 0)).toBeNull()
  })
})
