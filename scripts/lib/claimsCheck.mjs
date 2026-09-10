/**
 * scripts/lib/claimsCheck.mjs — G-07 claims-ledger conformance, extracted
 * from validate-brief.mjs so the number+context matching logic (which went
 * through two revisions during verification — see checkClaims's own
 * comments) is a testable pure function.
 *
 * Trigger-phrase list widened so this backstop applies regardless of which
 * agent drafted the content (Claude's own generator, or a Codex/Deep-
 * Research-assisted edit) — a fabricated historical stat shouldn't survive
 * just because it used a phrasing outside the original four triggers. Any
 * matched claim can still be excused with an explicit `(analysis)` marker
 * right after the sentence, for genuine interpretive lines that aren't
 * meant to cite a dataset — see ANALYSIS_MARKER below.
 */

const COMMODITY_KEYWORDS = {
  gold: /\bgold\b/i, silver: /\bsilver\b/i, crude: /\bcrude\b|\boil\b|\bwti\b|\bbrent\b/i,
  copper: /\bcopper\b/i, natgas: /\bnat(?:ural)?\s*gas\b/i, zinc: /\bzinc\b/i,
  aluminium: /\baluminium\b|\baluminum\b/i, lead: /\blead\b/i, nickel: /\bnickel\b/i,
}

// \b on the alternation matters: without it "often" matches inside ordinary
// words like "softened"/"softening", which are common in market prose and
// have nothing to do with a historical-pattern claim.
//
// The number-search window stops at a period as before, but now also at a
// newline, em dash (—), or parenthesis — verified against 575 real
// published files that phrases like "historically elevated rupee print —
// the COMEX crude gain of 4.17%" and "data shows gold-crude divergence
// (+1.14%" were otherwise grabbing an unrelated *live* figure from a
// separate clause/aside, not the historical-move number the trigger phrase
// was actually about. An en dash (–) stays allowed since real historical
// ranges use it ("historically gave back 60–70%").
// Deliberately excludes "data shows"/"history shows"/"records show" — on
// the same real-content check these read at least as often as a live-data
// presentation ("data shows the monsoon tracking 43%") as a historical
// claim, which is exactly the false-positive risk this file's own header
// comment on scope warns about.
//
// Verified against all 575 real published briefs/research/flash files:
// this widened version flags fewer files than the original four-trigger
// version (24 vs. 25), fixing two pre-existing cross-line false positives.
// One new false positive remains from adding "usually": a hedge clause like
// "...usually signals demand destruction, yet copper's +1.98%..." still
// attaches an unrelated live figure across a comma+conjunction boundary.
// Not worth chasing with more punctuation rules (see semanticDemote.mjs's
// header for why patching one phrasing at a time is unbounded) — if this
// ever actually blocks a real draft, label the sentence `(analysis)` rather
// than widening this regex further.
const HISTORICAL_PHRASE = /\b(historically|typically|on average|seasonally|usually|tends to|often|in past (?:instances|episodes)|in prior (?:instances|episodes)|in similar (?:instances|episodes|situations|cases)|in comparable (?:instances|episodes|situations|cases)|on such occasions|over the (?:past|last) \d+ years?)\b[^.\n()—]{0,80}?(\d+(?:\.\d+)?)\s*%/gi

// A statistic can be excused from the ledger requirement by an explicit,
// human/agent-authored marker right after the sentence — e.g.
// "...often precedes a pullback. *(analysis)*" or a trailing
// "<!-- analysis -->" comment — rather than by inventing new phrasing that
// dodges HISTORICAL_PHRASE. Keeps the fix bounded instead of an unbounded
// whack-a-mole on wording (see semanticDemote.mjs for why that path is bad).
const ANALYSIS_MARKER = /\(analysis\)|<!--\s*analysis\s*-->/i

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
    // The marker must belong to *this* sentence, not a later one. A naive
    // fixed-length lookahead lets a marker on the next sentence excuse this
    // one too — e.g. "Gold tends to fall 6%. Silver historically falls 7%.
    // *(analysis)*" wrongly cleared BOTH claims with an empty ledger before
    // this fix (found by Codex's first review of this file, verified by
    // reproducing it directly). Cut the window at the second sentence
    // terminator so a marker past it can't reach backward.
    const afterMatch = briefBody.slice(m.index + m[0].length, m.index + m[0].length + 80)
    const firstEnd = afterMatch.indexOf(".")
    const secondEnd = firstEnd === -1 ? -1 : afterMatch.indexOf(".", firstEnd + 1)
    const trailing = secondEnd === -1 ? afterMatch : afterMatch.slice(0, secondEnd)
    if (ANALYSIS_MARKER.test(trailing)) continue
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
