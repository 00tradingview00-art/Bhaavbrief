/**
 * scripts/lib/reelCampaignData.mjs — live-data fetchers for the 30-day reel
 * campaign (scripts/generate-campaign-reel.mjs). Each function returns a
 * small, already-formatted fact set the dispatcher injects verbatim into
 * generate-brief-reel.mjs's CONTEXT (matching the "use ONLY these numbers,
 * do not invent" pattern generate-learn-reel.mjs already establishes), or
 * null if the data genuinely isn't available right now — the dispatcher
 * falls back to a no-live-number reel rather than inventing a figure.
 *
 * PCR / Max Pain / IV history come from the public `/api/options` and
 * `/api/options/iv-history` routes (same anonymous-fetch pattern already
 * used by scripts/generate-atm-iv-reel.mjs) — these fields are free-tier
 * data (per-strike Greeks are stripped for anonymous callers; ATM Greeks are
 * deliberately NOT fetched here for that reason — see generate-campaign-reel.mjs).
 * Basis is computed locally from data/history/*.json + lib/parity.mjs,
 * mirroring lib/basis.ts's getBasisHistory() exactly (no public API exists
 * for it, and it doesn't need one — the source data is already local).
 */
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { computeImportParityCrudeINR, computeSpreadPct } from '../../lib/parity.mjs'

/**
 * Percentile rank (0-100) of `current` within `history` — the simplest honest
 * definition of "cheap or expensive right now" for Day 8/16's IV Rank framing.
 * Returns null if there isn't enough history to make the number meaningful.
 */
export function computeIvRank(history, current) {
  const values = history.map(h => h.iv).filter(v => Number.isFinite(v))
  if (values.length < 10 || !Number.isFinite(current)) return null
  const below = values.filter(v => v < current).length
  return Math.round((below / values.length) * 100)
}

/**
 * Picks the single most reel-worthy event from a merged event list: the
 * soonest 'high' impact_tier event if one exists, otherwise just the
 * soonest event overall. Returns null for an empty list.
 */
export function pickLeadEvent(events) {
  if (!events.length) return null
  const sorted = [...events].sort((a, b) => a.next_release_utc.localeCompare(b.next_release_utc))
  return sorted.find(e => e.impact_tier === 'high') ?? sorted[0]
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** PCR / Max Pain / IVIX / futurePrice for one instrument, via the public options API. */
export async function fetchOptionsSnapshot(site, instrument) {
  const data = await fetchJson(`${site}/api/options?instrument=${instrument}`)
  if (!data || typeof data.pcr !== 'number') return null
  return {
    pcr:         data.pcr,
    maxPain:     data.maxPain ?? null,
    ivix:        data.ivix ?? null,
    futurePrice: data.futurePrice ?? null,
    expiry:      data.expiry ?? null,
    chain:       Array.isArray(data.chain) ? data.chain : [],
  }
}

/** Top-N strikes by combined CE+PE OI, from an already-fetched chain. */
export function topOiStrikes(chain, n = 5) {
  return [...chain]
    .map(row => ({ strike: row.strike, oi: (row.CE?.oi ?? 0) + (row.PE?.oi ?? 0) }))
    .sort((a, b) => b.oi - a.oi)
    .slice(0, n)
}

/** IV Rank/Percentile for one instrument — current IVIX ranked against its own history. */
export async function fetchIvPercentile(site, instrument) {
  const snapshot = await fetchOptionsSnapshot(site, instrument)
  if (!snapshot || snapshot.ivix == null) return null
  const historyData = await fetchJson(`${site}/api/options/iv-history?instrument=${instrument}`)
  const history = historyData?.history ?? []
  const rank = computeIvRank(history, snapshot.ivix)
  if (rank == null) return null
  return { ivix: snapshot.ivix, rank, historyPoints: history.length }
}

/** Next reel-worthy calendar event across one or more instruments. */
export async function fetchNextEvent(site, instruments) {
  const perInstrument = await Promise.all(
    instruments.map(instrument => fetchJson(`${site}/api/events?instrument=${instrument}`))
  )
  const events = perInstrument.flatMap(d => d?.events ?? [])
  return pickLeadEvent(events)
}

/** Latest MCX-vs-COMEX/WTI basis reading — gold/silver precomputed in history
 *  files, crude computed on the fly, exactly mirroring lib/basis.ts. */
export function getBasisSnapshot(root) {
  const historyDir = join(root, 'data/history')
  let files
  try { files = readdirSync(historyDir).filter(f => f.endsWith('.json')).sort() }
  catch { return null }
  if (!files.length) return null

  const latest = files[files.length - 1]
  let data
  try { data = JSON.parse(readFileSync(join(historyDir, latest), 'utf8')) }
  catch { return null }

  const inst    = data.instruments ?? {}
  const derived = data.derived ?? {}
  const mcxCrude = inst.MCX_CRUDE?.price
  const wti      = inst.WTI?.price
  const usdinr   = inst.USDINR?.price
  const crudeParityINR = (wti && usdinr) ? computeImportParityCrudeINR(wti, usdinr) : 0
  const crudeSpreadPct = (mcxCrude && crudeParityINR > 0) ? computeSpreadPct(mcxCrude, crudeParityINR) : null

  const goldSpreadPct   = derived.mcxComexGoldSpreadPct   ?? null
  const silverSpreadPct = derived.mcxComexSilverSpreadPct ?? null
  if (goldSpreadPct == null && silverSpreadPct == null && crudeSpreadPct == null) return null

  return { asOf: latest.replace('.json', ''), goldSpreadPct, silverSpreadPct, crudeSpreadPct }
}
