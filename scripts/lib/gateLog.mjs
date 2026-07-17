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

export function appendGateLogEntry(entry, cwd = process.cwd()) {
  const line = JSON.stringify(entry)
  fs.appendFileSync(path.join(cwd, 'data/gate-log.jsonl'), line + '\n')
}

export function hashPayload(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16)
}
