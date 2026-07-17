/**
 * scripts/lib/edgeLedger.mjs — FIX-10 (D-14) "Yesterday's Edge" resolution
 * loop. Each brief's "Edge of the Day" is stored structured (edgeMetric,
 * edgeLevel, edgeCondition frontmatter, see generate-brief.js's prompt
 * schema), so the NEXT brief can resolve it against real data instead of
 * the site having no memory across 66+ editions.
 */

import fs from 'node:fs'
import path from 'node:path'

const LEDGER_PATH = path.join(process.cwd(), 'data/edge-ledger.json')

/**
 * @param {{edgeMetric?: string, edgeLevel?: number, edgeCondition?: string}} edge
 *   frontmatter pulled from yesterday's edition
 * @param {{instruments: Record<string, {price: number}>}} todaySnapshot
 *   today's fresh market-snapshot.json — by the time the morning brief
 *   generates, the COMEX/WTI figures already reflect the completed prior
 *   NY session, which is what an "closes above/below X tonight" edge
 *   actually asked readers to watch.
 * @returns {{verdict: 'confirmed'|'rejected'|'unresolved', resolvedValue: number|null, reason: string|null}}
 */
export function resolveEdge(edge, todaySnapshot) {
  if (!edge?.edgeMetric || edge.edgeLevel == null || !edge.edgeCondition) {
    return { verdict: 'unresolved', resolvedValue: null, reason: 'edge frontmatter missing or incomplete on the prior edition' }
  }
  if (edge.edgeCondition !== 'above' && edge.edgeCondition !== 'below') {
    return { verdict: 'unresolved', resolvedValue: null, reason: `edgeCondition "${edge.edgeCondition}" is not "above" or "below"` }
  }
  const inst = todaySnapshot?.instruments?.[edge.edgeMetric]
  if (!inst || !(inst.price > 0)) {
    return { verdict: 'unresolved', resolvedValue: null, reason: `no current price available for ${edge.edgeMetric}` }
  }
  const resolvedValue = inst.price
  const met = edge.edgeCondition === 'above' ? resolvedValue > edge.edgeLevel : resolvedValue < edge.edgeLevel
  return { verdict: met ? 'confirmed' : 'rejected', resolvedValue, reason: null }
}

/**
 * Renders the deterministic "Yesterday's Edge — Result" block prepended to
 * today's brief. Deliberately NOT LLM-generated — the verdict is a factual
 * resolution computed by resolveEdge() above, not narrative, and must be
 * exactly correct.
 */
export function formatEdgeResultBlock(priorEdition, edge, resolution) {
  if (!edge?.edgeMetric) return null
  const label = edge.edgeMetric.replace(/_/g, ' ')
  const verdictLabel = { confirmed: 'Confirmed ✓', rejected: 'Rejected ✗', unresolved: 'Unresolved —' }[resolution.verdict]
  const valueStr = resolution.resolvedValue != null
    ? `, now at ${resolution.resolvedValue.toLocaleString('en-IN')}`
    : ''
  const reasonStr = resolution.reason ? ` (${resolution.reason})` : ''
  return `**Yesterday's Edge — Result:** Edition #${priorEdition} watched whether ${label} would close ${edge.edgeCondition} ${edge.edgeLevel.toLocaleString('en-IN')}. **${verdictLabel}**${valueStr}${reasonStr}.`
}

export function appendToLedger(entry) {
  let ledger = []
  try {
    ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'))
  } catch {
    ledger = []
  }
  // Idempotent on edition number — never write a duplicate resolution if this
  // runs twice for the same edition (e.g. a retried workflow).
  ledger = ledger.filter((e) => e.forEdition !== entry.forEdition)
  ledger.push(entry)
  ledger.sort((a, b) => a.forEdition - b.forEdition)
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true })
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n')
  return ledger
}
