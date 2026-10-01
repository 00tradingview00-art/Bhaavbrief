/**
 * scripts/lib/gateLog.mjs — shared append helper for data/gate-log.jsonl.
 *
 * Two record types share this one file, distinguished by `type`:
 *  - 'gate_run' (scripts/validate-brief.mjs): publication-gate results.
 *  - 'generation_call' (scripts/generate-brief.js, Part 8.4): prompt
 *    version, model, tokens, latency, payload hash for every Claude call —
 *    "any published brief can be traced to exact prompt+payload."
 * The master doc names one destination ("→ gate-log") for both; JSONL
 * doesn't require a fixed schema per line, so a `type` field is enough to
 * keep readers (scripts/send-telemetry-digest.mjs) able to tell them apart
 * without needing two files.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// GATE_LOG_PATH redirects the log (tests run the real gate script from the
// repo root, and used to append their fixture runs to the production
// data/gate-log.jsonl — 48 of 114 gate_run rows at the 30 Sep review).
export function appendGateLogEntry(entry, cwd = process.cwd()) {
  const line = JSON.stringify(entry)
  const file = process.env.GATE_LOG_PATH || path.join(cwd, 'data/gate-log.jsonl')
  fs.appendFileSync(file, line + '\n')
}

export function hashPayload(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16)
}
