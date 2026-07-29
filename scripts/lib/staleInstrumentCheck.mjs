/**
 * scripts/lib/staleInstrumentCheck.mjs — blocks a brief that cites an
 * instrument as if it were live when the snapshot itself marked it
 * `stale: true` (fetch-snapshot.mjs sets this when the live Kite fetch
 * failed and a cached/carried-forward value was used instead).
 *
 * Before this existed, the only thing that ever caught this was the Layer 2
 * LLM semantic checker noticing by chance (it did, once, on 2026-07-29 —
 * MCX_NATGAS's contract token had gone stale after a missed instrument
 * rollover). Layer 1 exists precisely so this class of thing doesn't depend
 * on an LLM noticing — see validate-brief.mjs's own header comment on the
 * two-layer split.
 */

const INSTRUMENT_NAMES = {
  MCX_GOLD:   { label: "MCX Gold",   pattern: /\bgold\b/i },
  MCX_SILVER: { label: "MCX Silver", pattern: /\bsilver\b/i },
  MCX_CRUDE:  { label: "MCX Crude",  pattern: /\bcrude\b/i },
  MCX_COPPER: { label: "MCX Copper", pattern: /\bcopper\b/i },
  MCX_NATGAS: { label: "MCX NatGas", pattern: /\bnat(?:ural)?\s*gas\b/i },
};

/**
 * @param {string} briefBody - the brief content (frontmatter already stripped)
 * @param {Record<string, {stale?: boolean}>} instruments - snapshot.instruments
 * @returns {string[]} issue messages, empty if nothing stale is cited
 */
export function checkStaleInstruments(briefBody, instruments) {
  const issues = [];
  for (const [key, { label, pattern }] of Object.entries(INSTRUMENT_NAMES)) {
    if (!instruments?.[key]?.stale) continue;
    if (!pattern.test(briefBody)) continue;
    issues.push(
      `STALE-INSTRUMENT: ${label} is cited in the brief but its snapshot data is stale (live Kite fetch failed; using a carried-forward value) — do not present as today's price`
    );
  }
  return issues;
}
