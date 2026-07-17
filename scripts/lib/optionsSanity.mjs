/**
 * scripts/lib/optionsSanity.mjs — Part 7 weekly model sanity report:
 * "ATM IV vs realized (AAV) spread trend, count of parity violations, %
 * strikes per tier — appended to the weekly digest. If JUNK% rises, the
 * upstream quote feed degraded; you find out from the digest, not a user."
 *
 * Pulls from the live production API (same MONITOR_BASE_URL convention as
 * scripts/synthetic-monitor.mjs) rather than reimplementing the option
 * chain/solver logic in a second, un-synced copy — exercises the real
 * served data, consistent with Part 4's "checks what a user sees" approach.
 */

export const MCX_SANITY_INSTRUMENTS = ['GOLD', 'SILVER', 'CRUDEOIL', 'NATURALGAS', 'COPPER']

/** @param {{CE: {tier: string, iv: number|null}, PE: {tier: string, iv: number|null}}[]} chain */
export function computeTierDistribution(chain) {
  let live = 0, stale = 0, junk = 0, total = 0
  for (const row of chain ?? []) {
    for (const side of [row.CE, row.PE]) {
      if (!side || !side.tier) continue
      total++
      if (side.tier === 'LIVE') live++
      else if (side.tier === 'STALE') stale++
      else if (side.tier === 'JUNK') junk++
    }
  }
  if (total === 0) return { total: 0, livePct: null, stalePct: null, junkPct: null }
  return {
    total,
    livePct: Math.round((live / total) * 1000) / 10,
    stalePct: Math.round((stale / total) * 1000) / 10,
    junkPct: Math.round((junk / total) * 1000) / 10,
  }
}

/**
 * Approximates parity-driven demotions: both legs at a strike are STALE
 * with a solved IV — the liquidity-only demotion path leaves `iv: null`
 * (Greeks/IV are only computed for quotes that passed the pre-filter), so
 * "both STALE but both still carry an IV" is the parity-check's signature.
 * Not a perfect count (the API doesn't expose a dedicated flag) but a
 * meaningfully different number from "both illiquid," which is the
 * distinction the master doc's R-04 runbook cares about.
 */
export function countParityViolations(chain) {
  return (chain ?? []).filter(
    (r) => r.CE?.tier === 'STALE' && r.PE?.tier === 'STALE' && r.CE?.iv != null && r.PE?.iv != null
  ).length
}

export function classifyIVTrend(currentIV, weekAgoIV) {
  if (currentIV == null || weekAgoIV == null) return 'unknown'
  const deltaPts = currentIV - weekAgoIV
  if (Math.abs(deltaPts) < 1) return 'flat'
  return deltaPts > 0 ? 'widening' : 'narrowing'
}

async function fetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** @returns {Promise<object>} per-instrument sanity summary */
export async function fetchInstrumentSanity(baseUrl, instrument) {
  const [chainResp, ivHistResp, aavHistResp] = await Promise.all([
    fetchJson(`${baseUrl}/api/options?instrument=${instrument}`),
    fetchJson(`${baseUrl}/api/options/iv-history?instrument=${instrument}`),
    fetchJson(`${baseUrl}/api/options/aav-history?instrument=${instrument}`),
  ])

  const tiers = computeTierDistribution(chainResp?.chain)
  const parityViolations = countParityViolations(chainResp?.chain ?? [])

  const ivHistory = ivHistResp?.history ?? []
  const currentIV = ivHistory.length ? ivHistory[ivHistory.length - 1].iv : null
  const weekAgoIV = ivHistory.length >= 6 ? ivHistory[Math.max(0, ivHistory.length - 6)].iv : null

  const aavHistory = aavHistResp?.history ?? []
  const currentAAV = aavHistory.length ? aavHistory[aavHistory.length - 1].aav : null

  const spread = currentIV != null && currentAAV != null ? Math.round((currentIV - currentAAV) * 10) / 10 : null

  return {
    instrument,
    tiers,
    parityViolations,
    currentIV,
    currentAAV,
    spread,
    trend: classifyIVTrend(currentIV, weekAgoIV),
  }
}

export function formatOptionsSanitySection(summaries) {
  const lines = ['', '<b>Options model sanity (weekly)</b>']
  for (const s of summaries) {
    const tierStr = s.tiers.total > 0
      ? `LIVE ${s.tiers.livePct}% / STALE ${s.tiers.stalePct}% / JUNK ${s.tiers.junkPct}%`
      : 'no data'
    const ivStr = s.currentIV != null ? `${s.currentIV}%` : '—'
    const aavStr = s.currentAAV != null ? `${s.currentAAV}%` : '—'
    const spreadStr = s.spread != null ? `${s.spread > 0 ? '+' : ''}${s.spread}pt (${s.trend})` : 'n/a'
    lines.push(`${s.instrument}: ${tierStr} · ${s.parityViolations} parity violation(s) · IV ${ivStr} vs AAV ${aavStr} = ${spreadStr}`)
  }
  const anyJunkHigh = summaries.some((s) => s.tiers.junkPct != null && s.tiers.junkPct > 20)
  if (anyJunkHigh) lines.push('⚠ JUNK% elevated on at least one instrument — check the upstream Kite quote feed (R-04).')
  return lines.join('\n')
}
