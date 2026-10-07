// Single source of truth for the RBI repo rate — read by the dashboard card
// (components/markets/MarketsClient.tsx) and by the policy/geopolitical flash
// monitors (scripts/monitor-*.js) so neither can drift out of sync or let an
// LLM invent a figure. Plain .js (not .ts) so plain-Node scripts can import it
// directly — see CLAUDE.md's cross-boundary import convention.
//
// Manually updated after each RBI MPC decision (~6x/year) — not a live feed.
// Last verified: 63rd MPC meeting, 5-7 Oct 2026, hiked 25 bps to 5.50% (unanimous),
// stance changed to 'calibrated tightening'.
export const REPO_RATE_PCT = 5.5
export const REPO_RATE_ASOF = '2026-10-07'
