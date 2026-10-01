#!/usr/bin/env node
/**
 * scripts/clean-iv-history.mjs — one-off repair of points already stored in
 * iv-hist:{instrument} (Upstash Redis), using exactly the rules the nightly
 * snapshot now applies before writing (lib/ivSnapshotRules.js).
 *
 * Found live on 2026-09-30: near-zero readings written on/after option
 * expiries (GOLD 1.17, SILVERM 0.21, CRUDEOIL 0.8, NATURALGAS 8.65, …) and
 * Saturday-dated rows from end-of-day runs that finished after midnight.
 * They distort IV Rank/percentile for 90 days.
 *
 * Usage:
 *   node scripts/clean-iv-history.mjs                       # dry run (default): list only
 *   node scripts/clean-iv-history.mjs --apply --backup FILE # back up every affected
 *                                                           # hash to FILE, then apply
 * Needs UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN in the environment.
 */

import fs from 'fs'
import { implausibleIVReason } from '../lib/ivSnapshotRules.js'
import { isTradingHoliday } from './lib/holidays.js'

// Same keys as MCX_INSTRUMENTS in lib/options.ts. The COMPOSITE series is a
// different metric (full-chain iVIX average) and is deliberately not touched.
const INSTRUMENTS = ['GOLD', 'GOLDM', 'SILVER', 'SILVERM', 'CRUDEOIL', 'CRUDEOILM', 'NATURALGAS', 'COPPER']
const TRAILING = 20

/** Nearest trading day before `date` (YYYY-MM-DD). */
function previousTradingDay(date) {
  const d = new Date(`${date}T05:30:00Z`)
  do { d.setUTCDate(d.getUTCDate() - 1) } while (isTradingHoliday(d.toISOString().slice(0, 10)))
  return d.toISOString().slice(0, 10)
}

/**
 * Plans the repair of one series.
 *
 * A point dated on a weekend/holiday is an end-of-day run that finished after
 * midnight: it belongs to the previous trading day. If that day has no
 * reading it is moved there (it's real data); if it already has one, the
 * extra row is removed. Then the series is walked oldest→newest and each
 * point judged against the trailing window of points already accepted, so
 * one bad point can't vouch for the next.
 * @param {{date: string, iv: number}[]} points
 * @returns {{date: string, iv: number, action: 'remove' | 'move', to?: string, reason: string}[]}
 */
export function planCleanup(points) {
  const actions = []
  const dates = new Set(points.map(p => p.date))
  const series = []
  for (const p of [...points].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!isTradingHoliday(p.date)) { series.push({ ...p }); continue }
    const to = previousTradingDay(p.date)
    if (dates.has(to)) {
      actions.push({ ...p, action: 'remove', reason: `dated on a weekend/holiday; ${to} already has a reading` })
    } else {
      dates.add(to)
      series.push({ date: to, iv: p.iv, movedFrom: p.date })
    }
  }

  const accepted = []
  for (const p of series.sort((a, b) => a.date.localeCompare(b.date))) {
    const reason = implausibleIVReason(p.iv, accepted.slice(-TRAILING))
    if (reason) {
      actions.push({ date: p.movedFrom ?? p.date, iv: p.iv, action: 'remove', reason })
    } else {
      accepted.push(p.iv)
      if (p.movedFrom) {
        actions.push({ date: p.movedFrom, iv: p.iv, action: 'move', to: p.date, reason: 'weekend/holiday-dated run belongs to the previous session' })
      }
    }
  }
  return actions.sort((a, b) => a.date.localeCompare(b.date))
}

async function redis(...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set')
  const res = await fetch(`${url}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Redis ${args[0]} failed: ${res.status} ${await res.text()}`)
  return (await res.json()).result ?? null
}

function toPoints(raw) {
  const points = []
  for (let i = 0; i < (raw ?? []).length; i += 2) {
    const iv = parseFloat(raw[i + 1])
    if (!Number.isNaN(iv)) points.push({ date: raw[i], iv })
  }
  return points
}

async function main() {
  const apply = process.argv.includes('--apply')
  const backupIdx = process.argv.indexOf('--backup')
  const backupPath = backupIdx > -1 ? process.argv[backupIdx + 1] : null
  if (apply && !backupPath) {
    console.error('Refusing to --apply without --backup FILE')
    process.exit(2)
  }

  const plan = {}
  const backup = {}
  for (const inst of INSTRUMENTS) {
    const raw = await redis('hgetall', `iv-hist:${inst}`)
    const points = toPoints(raw)
    backup[`iv-hist:${inst}`] = raw
    plan[inst] = planCleanup(points)
    const list = plan[inst]
      .map(a => `${a.action === 'move' ? `move ${a.date} → ${a.to}` : `remove ${a.date}`} = ${a.iv} (${a.reason})`)
      .join('\n    ')
    console.log(`${inst}: ${points.length} points, ${plan[inst].length} change(s)${list ? `\n    ${list}` : ''}`)
  }

  const total = Object.values(plan).reduce((n, l) => n + l.length, 0)
  if (!apply) {
    console.log(`\nDry run — ${total} change(s) planned. Nothing was changed.`)
    return
  }

  fs.writeFileSync(backupPath, JSON.stringify({ takenAt: new Date().toISOString(), backup }, null, 2))
  console.log(`\nBacked up ${Object.keys(backup).length} hashes to ${backupPath}`)
  const today = new Date().toISOString().slice(0, 10)
  for (const [inst, actions] of Object.entries(plan)) {
    for (const a of actions) {
      if (a.action === 'move') {
        await redis('hset', `iv-hist:${inst}`, a.to, String(a.iv))
        await redis('hset', `iv-hist-meta:${inst}`, a.to, `moved ${today} from ${a.date}: ${a.reason}`)
      }
      await redis('hdel', `iv-hist:${inst}`, a.date)
      await redis('hset', `iv-hist-meta:${inst}`, a.date, `${a.action === 'move' ? `moved to ${a.to}` : 'removed'} ${today}: ${a.iv} — ${a.reason}`)
    }
  }
  console.log(`Applied ${total} change(s).`)
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch(err => { console.error(err.message); process.exit(1) })
}
