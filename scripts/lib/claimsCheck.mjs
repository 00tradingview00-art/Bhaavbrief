/**
 * scripts/lib/claimsCheck.mjs — G-07 claims-ledger conformance, extracted
 * from validate-brief.mjs so the number+context matching logic (which went
 * through two revisions during verification — see checkClaims's own
 * comments) is a testable pure function.
 */

const COMMODITY_KEYWORDS = {
  gold: /\bgold\b/i, silver: /\bsilver\b/i, crude: /\bcrude\b|\boil\b|\bwti\b|\bbrent\b/i,
  copper: /\bcopper\b/i, natgas: /\bnat(?:ural)?\s*gas\b/i, zinc: /\bzinc\b/i,
  aluminium: /\baluminium\b|\baluminum\b/i, lead: /\blead\b/i, nickel: /\bnickel\b/i,
}

const HISTORICAL_PHRASE = /(historically|typically|on average|in past (?:instances|episodes)|in prior (?:instances|episodes))[^.]{0,80}?(\d+(?:\.\d+)?)\s*%/gi

/**
 * @param {string} briefBody
 * @param {Array<{claim_id: string, values?: {avgAbsMovePct?: number, maxAbsMovePct?: number}}>} claims
 * @returns {string[]} issue messages, empty if clean
 */
export function checkClaims(briefBody, claims) {
  const issues = []
  for (const m of briefBody.matchAll(HISTORICAL_PHRASE)) {
    const stated = parseFloat(m[2])
    const context = briefBody.slice(Math.max(0, m.index - 150), m.index + m[0].length + 50)
    const isLedgered = claims.some((c) => {
      const commodity = c.claim_id.split("__")[1]
      const commodityRe = COMMODITY_KEYWORDS[commodity]
      if (!commodityRe?.test(context)) return false
      const a = c.values?.avgAbsMovePct, mx = c.values?.maxAbsMovePct
      return (typeof a === "number" && Math.abs(a - stated) < 0.05)
          || (typeof mx === "number" && Math.abs(mx - stated) < 0.05)
    })
    if (!isLedgered) {
      issues.push(
        `CLAIMS: unledgered historical statistic "${m[0].trim()}" — ${stated}% does not match any data/claims.json entry for the mentioned commodity`
      )
    }
  }
  return issues
}
