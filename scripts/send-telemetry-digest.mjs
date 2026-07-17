#!/usr/bin/env node
/**
 * scripts/send-telemetry-digest.mjs — Part 4.2 weekly pipeline telemetry
 * digest to Telegram: editions published, gate pass rate, monitor incidents,
 * edge-ledger track record. Read-only — never writes anything. Dormant
 * (logs and exits 0) unless TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID are set,
 * same pattern as scripts/apply-human-gate.mjs.
 *
 * Alert-fatigue rule (master doc 4.2): this is the ONLY place non-S1
 * conditions surface — everything batches here instead of paging in
 * real time, so a once-a-week message stays worth reading.
 *
 * Usage: node scripts/send-telemetry-digest.mjs
 * Env:   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (required to send)
 *        GITHUB_TOKEN, GITHUB_REPOSITORY (optional — enables the monitor-incident count)
 */
import fs from 'node:fs'
import path from 'node:path'
import { sendTelegramMessage } from './lib/telegram.mjs'

const WINDOW_DAYS = 7
const windowStart = Date.now() - WINDOW_DAYS * 24 * 3600 * 1000

function readGateLog() {
  const file = path.join(process.cwd(), 'data/gate-log.jsonl')
  if (!fs.existsSync(file)) return []
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line) } catch { return null } })
    .filter(Boolean)
    .filter((entry) => new Date(entry.checkedAt).getTime() >= windowStart)
}

function readEdgeLedger() {
  const file = path.join(process.cwd(), 'data/edge-ledger.json')
  if (!fs.existsSync(file)) return null
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

async function fetchMonitorIncidents() {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY
  if (!token || !repo) return null // not running in CI — skip, don't fabricate a count
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues?labels=monitor-incident&state=all&since=${new Date(windowStart).toISOString()}&per_page=100`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return null
    const issues = await res.json()
    return Array.isArray(issues) ? issues : null
  } catch {
    return null
  }
}

export function buildDigest({ gateEntries, edgeLedger, incidents }) {
  const totalRuns = gateEntries.length
  const cleanRuns = gateEntries.filter((e) => e.clean).length
  const internalErrors = gateEntries.filter((e) => e.hasInternalError).length
  const passRatePct = totalRuns > 0 ? Math.round((cleanRuns / totalRuns) * 1000) / 10 : null

  const lines = [`<b>BhaavBrief weekly telemetry digest</b> (last ${WINDOW_DAYS}d)`, '']

  lines.push(`Gate runs: ${totalRuns} · clean: ${cleanRuns} · pass rate: ${passRatePct !== null ? passRatePct + '%' : 'n/a (no runs)'}`)
  if (internalErrors > 0) lines.push(`⚠ ${internalErrors} gate-internal failure(s) this week — check GATE_INTERNAL_ERROR entries in data/gate-log.jsonl`)

  if (incidents === null) {
    lines.push('Monitor incidents: not available (GITHUB_TOKEN/GITHUB_REPOSITORY not set)')
  } else {
    const open = incidents.filter((i) => i.state === 'open').length
    lines.push(`Monitor incidents: ${incidents.length} (${open} still open)`)
  }

  if (edgeLedger?.entries?.length) {
    const confirmed = edgeLedger.entries.filter((e) => e.result === 'confirmed').length
    const rejected = edgeLedger.entries.filter((e) => e.result === 'rejected').length
    const unresolved = edgeLedger.entries.filter((e) => e.result === 'unresolved').length
    lines.push(`Edge ledger (all-time): ${confirmed} confirmed, ${rejected} rejected, ${unresolved} unresolved`)
  } else {
    lines.push('Edge ledger: no entries yet')
  }

  lines.push('', 'Overrides-used tracking is not yet wired up — G-12 approvals aren\'t logged separately from ordinary commits.')

  return lines.join('\n')
}

async function main() {
  const gateEntries = readGateLog()
  const edgeLedger = readEdgeLedger()
  const incidents = await fetchMonitorIncidents()
  const digest = buildDigest({ gateEntries, edgeLedger, incidents })

  console.log(digest.replace(/<\/?b>/g, ''))

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.log('\nTELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set — digest logged above only, not sent.')
    return
  }
  const result = await sendTelegramMessage(digest)
  if (!result.ok) console.warn('Telegram digest not sent:', result.reason)
  else console.log('\nTelegram digest sent.')
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })
