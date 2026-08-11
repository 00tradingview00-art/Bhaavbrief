#!/usr/bin/env node
/**
 * CI gate: validates data/commodity-constants.json internal consistency
 * and cross-checks against data/contract-specs.json where both cover
 * the same commodity.
 *
 * Exit 0 = all checks pass. Exit 1 = at least one check failed.
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function load(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'))
}

const constants = load('data/commodity-constants.json')
const contractSpecs = load('data/contract-specs.json')

let failures = 0

function fail(msg) {
  console.error(`FAIL: ${msg}`)
  failures++
}

function check(condition, msg) {
  if (!condition) fail(msg)
}

// ── Commodity-level required fields ─────────────────────────────────────────

const REQUIRED_TAX = ['crude', 'gold', 'silver', 'copper', 'natgas', 'zinc', 'aluminium', 'lead', 'nickel']
for (const key of REQUIRED_TAX) {
  check(constants[key], `Missing commodity entry: ${key}`)
  if (constants[key]) {
    check(typeof constants[key].taxTreatment === 'string' && constants[key].taxTreatment.length > 0,
      `${key}.taxTreatment is missing or empty`)
    // The text CAN mention "STCG does not apply" — but must never say "or STCG" (which would imply it's valid)
    check(!constants[key].taxTreatment?.match(/\bor STCG\b|\bSTCG or\b/),
      `${key}.taxTreatment must not offer STCG as an option (MCX commodity futures are always non-speculative business income)`)
  }
}

// ── Duty factor range checks ─────────────────────────────────────────────────

const DUTY_FACTOR_KEYS = {
  crude: 'importDutyFactor',
  gold: 'importDutyFactorEffective',
  silver: 'importDutyFactor',
}
for (const [key, field] of Object.entries(DUTY_FACTOR_KEYS)) {
  const val = constants[key]?.[field]
  if (val != null) {
    check(val >= 1.0 && val <= 1.5,
      `${key}.${field} = ${val} is outside sensible range [1.0, 1.5]`)
  }
}

// ── Crude-specific ────────────────────────────────────────────────────────────

const crude = constants.crude
if (crude) {
  check(crude.importDutyFactor === 1.025,
    `crude.importDutyFactor must be 1.025 (got ${crude.importDutyFactor}); hawk-scan prompt depends on this exact value`)
  check(crude.litresPerBarrel === 159,
    `crude.litresPerBarrel must be 159 (got ${crude.litresPerBarrel})`)
  check(crude.opec?.memberCount === 12,
    `crude.opec.memberCount must be 12 (Angola exited Jan 2024; got ${crude.opec?.memberCount})`)
  check(crude.opec?.totalNations === 23,
    `crude.opec.totalNations must be 23 (got ${crude.opec?.totalNations})`)
}

// ── Cross-check lot sizes vs contract-specs.json ─────────────────────────────

const LOT_CHECKS = [
  { key: 'crude',  field: 'mcxLotSizeBarrels',  specField: 'contractSize' },
  { key: 'silver', field: 'mcxLotSizeKg',        specField: 'contractSize' },
  { key: 'copper', field: 'mcxLotSizeKg',        specField: 'contractSize' },
]
for (const { key, field, specField } of LOT_CHECKS) {
  const c = constants[key]?.[field]
  const s = contractSpecs[key]?.[specField]
  if (c != null && s != null) {
    check(c === s,
      `${key}.${field} (${c}) does not match contract-specs.json ${key}.${specField} (${s})`)
  }
}

// ── Cross-check tick values ───────────────────────────────────────────────────

const TICK_CHECKS = ['crude', 'gold', 'silver', 'copper', 'natgas']
for (const key of TICK_CHECKS) {
  const c = constants[key]?.tickValuePerLotINR
  const s = contractSpecs[key]?.tickValuePerLot
  if (c != null && s != null) {
    check(c === s,
      `${key}.tickValuePerLotINR (${c}) does not match contract-specs.json ${key}.tickValuePerLot (${s})`)
  }
}

// ── Result ───────────────────────────────────────────────────────────────────

if (failures === 0) {
  console.log(`check-commodity-constants: all checks passed`)
  process.exit(0)
} else {
  console.error(`check-commodity-constants: ${failures} check(s) failed`)
  process.exit(1)
}
