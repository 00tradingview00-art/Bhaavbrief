# Decision-Support Roadmap

**Status:** all items shipped. Calendar surprise-conditioning was initially blocked on a
data-sourcing decision (no forecast/consensus feed exists in this codebase, and
`data/event-map.json`'s own header note explicitly prohibits scraping third-party consensus
calendars — ToS risk, product decision) — resolved by conditioning on each release's own
trailing history instead of external consensus, scoped to the two EIA-sourced events that
actually have one. Each item shipped as its own plan and its own commit, per this repo's "one
defect/feature per commit" convention (CLAUDE.md, Working conventions).

## Premise

BhaavBrief already has enough surface area — Markets, commodity pages, Feed, Daily Brief,
Calendar, option chain, IV analytics, OI, Max Pain/PCR, Strategy Builder, Basis, P&L, Research.
The next real gains come from making each of those answer the question a trader actually has,
not from adding more pages:

1. What is it now?
2. What changed?
3. Is that unusual?
4. Why does it matter?
5. What confirms or contradicts the read?
6. What's the risk to someone acting on it?

This isn't a new idea for this repo — it's this repo's own founding principles applied
consistently: "fix bugs before features," "timestamps on everything," and "no SEBI-adjacent
advice language" (`project-founding-principles` memory) already point the same direction. What
follows was triggered by an external product audit, but every item below was verified against
this codebase directly before being included — two of the audit's original claims (OI
concentration, Strategy Builder's Greeks/scenario tooling) turned out to be wrong once checked
against source, so nothing here is taken on the audit's word alone.

## Explicitly out of scope

- **Feed** (story staleness/lifecycle marking, e.g. flagging a reversed price move) — left as-is
  by explicit decision.
- **Daily Brief** (the audit proposed restructuring "The Market Is Saying" into an
  evidence-for/evidence-against format) — left as-is. The 5-section flowing-prose format is a
  documented sacred invariant (`feedback-brief-structure` memory): a past attempt to "clean up"
  the format by trimming sections caused real regeneration pain. Changing it needs its own
  explicit instruction, not a third-party audit's suggestion.
- **Pro Research directive language** — verification did confirm a real issue here
  (`scripts/generate-research.mjs:163` requires a directive "Options positioning suggestion"
  section with example strike-level language, and line 169 explicitly waives any in-body
  disclaimer, contradicting the Reels V3 non-advice standard in `AGENTS.md` /
  `docs/reels-v3-production-standard.md`). It's excluded here only because Codex already owns
  Pro Research (same split as Reels — see CLAUDE.md Part 9). Flagged for Codex, not scoped here.

## Tier 1 — correctness bugs (fix first)

Unambiguous, no design judgment required.

### ✅ Done (`67d2e561`) — Basis tool mislabels a duty-free number as "import parity"
- `lib/parity.mjs`'s `computeImportParityGoldINR`/`computeImportParityCrudeINR` are pure FX
  conversions (COMEX/WTI price × USDINR) — no duty factor anywhere in them.
- `app/basis/page.tsx` and `app/tools/mcx-basis/page.tsx` present that duty-free number as
  "import parity" (e.g. "vs COMEX import parity"), producing a ~13.5% "premium" for gold that's
  mostly just the unaccounted-for ~12% import duty.
- The commodity pages (`app/commodities/[commodity]/page.tsx:370-406`) separately apply the real
  duty factor from `data/commodity-constants.json` (gold 1.12×, silver 1.10×, crude 1.025×) and
  correctly label the result "Duty-inclusive import parity" — so the same underlying calculation
  already exists, it's just not wired into the Basis tool.
- Shipped: `lib/basis.ts` now computes a separate duty-inclusive spread
  (`goldDutySpreadPct`/`silverDutySpreadPct`/`crudeDutySpreadPct`) read-side only, reusing the
  same `data/commodity-constants.json` duty factors — zero changes to the fields the
  gate/brief/email/reel pipeline consume. Both Basis pages show the FX-only number relabeled
  plus the duty-inclusive figure. CLAUDE.md's ownership-map line corrected.

### ✅ Done (`0f06674d`) — Timestamp "IST IST" duplication + date/time drift
- `app/commodities/[commodity]/page.tsx:732` renders `{a.time} IST`, unconditionally appending
  " IST" regardless of whether `a.time` already contains it.
- Root cause is upstream: `scripts/intelligence-engine.js`'s prompt shows the model a line like
  `TIME: ${timeStr} IST, ${dateStr}` (~line 827), and the model sometimes echoes "...IST" into
  the `time:` frontmatter field it returns instead of the bare value — reproduced in
  `content/articles/2026-09-24-hawk-scan-mcx-nat-gas-9-34-to-317-storage-draw-signal.mdx`, which
  also showed a genuine ~5.5h drift between its `date` (UTC) and `time` (IST) fields.
- Shipped: `lib/articles.ts` strips any trailing "IST" defensively at read time (both
  `getAllArticles()`/`getArticleBySlug()`, covering all three render sites). Root cause also
  fixed: `scripts/intelligence-engine.js`'s `saveArticle()` strips it at the one write
  chokepoint before it reaches disk, and all three prompt templates now explicitly tell the
  model the date/time values are pre-filled and must be copied byte-for-byte.

## Tier 2 — interpretive-label inconsistency

Low-risk: converging onto a pattern that already exists elsewhere in this codebase, not new
design.

### ✅ Done (`62b4e41d`) — PCR Bullish/Bearish labels
- `app/tools/mcx-pcr/page.tsx:63-65`, `components/terminal/OptionsIntelligencePanel.tsx:14-16`,
  and `components/terminal/CommodityGatewayCard.tsx:36,38` render bare "Bullish"/"Bearish" pills
  off raw PCR thresholds, with no hedging.
- `components/mcx/OptionChain.tsx:450-460` already solved this — it uses
  "Put-heavy/Call-heavy/Balanced" instead, with a code comment explaining why: the label
  describes the positioning data itself, not a directional call; the "conventionally read as
  bullish/bearish" framing lives in an info tooltip instead.
- Shipped: all three surfaces converged onto `OptionChain.tsx`'s existing
  Put-heavy/Call-heavy/Balanced labels and thresholds.

### ✅ Done (`130c927e`) — Max Pain overconfident wording
- `app/tools/mcx-max-pain/page.tsx:70` — "Futures often gravitate toward max pain in the last
  week before expiry."
- `app/tools/mcx-max-pain/page.tsx:115-116` — "market writers have strong incentive to pin here"
  / "call writers may hedge aggressively, creating drag" — stated as fact, no disclaimer
  anywhere on the page.
- Shipped: `lib/maxPainRelevance.ts`'s `relevanceOf()` computes a High/Moderate/Low relevance
  per instrument from days-to-expiry, distance from the strike, and OI concentration there (all
  already in `getOptionsChain`'s existing chain/expiry data). The page shows this per row and
  explains the tiers instead of asserting the pin effect outright.

## Tier 3 — genuine capability gaps

Real product work, each independently scoped. **Every item here must satisfy the minimalist-design
standing preference** (`feedback-minimalist-design` memory — "less on screen, not more, unless a
change genuinely calls for otherwise") via progressive disclosure (tooltip, collapsible, secondary
line) rather than flat density stacked into the default view. The audit's own mockups lean toward
dense tables; don't implement those literally.

### ✅ Done (`ac20d67a`) — iVIX → ₹ expected-move translation
- Confirmed nothing like this exists anywhere in the repo (zero hits for "expected move").
  `components/terminal/MarketPulsePanel.tsx:47,60` and `app/options/[commodity]/page.tsx:203,219`
  show iVIX/vol-premium as raw %/pp only.
- Shipped: `lib/expectedMove.ts` derives the 1σ move by expiry from price × IV × √(DTE/365) —
  using the same calendar-day/365 convention as `lib/options.ts`'s own Black-76 T, not a
  mismatched 252-trading-day one. `MarketPulsePanel` was left alone on purpose: its iVIX is a
  cross-commodity composite with no single underlying price to apply a ₹ move to. Surfaced in
  the option chain's iVIX tooltip and the per-commodity options page's intro line —
  progressive disclosure, no new visible chrome.

### ✅ Done (`f5c0de59`) — Calendar: no surprise-conditioned reactions
- `lib/eventMapTypes.ts:18-31` — `consensus_field` is always null; only a single `prior_field`
  exists. `scripts/compute-event-impact.mjs` computed one blended `avgAbsMovePct`/`maxAbsMovePct`
  regardless of whether a release beat or missed anything.
- Was genuinely blocked on a sourcing decision, not just code: `data/event-map.json`'s own
  header note explicitly prohibits scraping third-party consensus calendars (ToS risk, product
  decision), so real market consensus was never an option without a licensed data vendor.
- Shipped: condition on the release's own trailing history instead of external consensus.
  `scripts/fetch-eia-data.mjs` now stores a trailing 24-week series (`recent_values`) for the two
  EIA-sourced events (Natural Gas Storage, Petroleum Status) via the same official EIA API
  already in use. `scripts/lib/eventSurprise.mjs` splits historical price reactions into
  "release above its own trailing average" vs "below" buckets; `CalendarFilterBar.tsx` shows
  this as a secondary line, neutrally labeled. Scoped to just the two EIA events — other events
  (FOMC, OPEC+, CPI) have no API enumerating past releases at all and are unaffected.

### ✅ Done (`9b1493c4`) — Commodity "What Moves X" driver lists are fully static
- `data/market-structure.json`'s `priceDrivers` arrays, rendered via `loadMarketStructure()` at
  `app/commodities/[commodity]/page.tsx:788-801`, are plain strings with zero live-value binding
  — even though live prices (e.g. USDINR) already exist elsewhere on the same page.
- Shipped: a compact "Live right now" line above the driver list showing USD/INR plus the
  relevant international benchmark (COMEX gold/silver, WTI, Henry Hub) where one exists in the
  snapshot. Copper and others without a wired benchmark feed just show USDINR, not a fabricated
  number. The evergreen driver text itself (OPEC decisions, China PMI) was left untouched — no
  live feed exists to bind those to.

### ✅ Done (`31fd177f`) — Correlation matrix shows only current value, no trend
- `lib/correlation.ts:107` (`getCorrelationMatrix`) computes one 20-day Pearson value per pair
  and returns only `{labels, matrix, sampleSize}` — no prior-window comparison anywhere.
- Shipped: `getCorrelationMatrix` now also returns `priorMatrix` (the immediately preceding
  window), null once there isn't enough history for a second full window rather than a padded
  one. Surfaced as a hover tooltip per cell in `CorrelationHeatmap.tsx` (current vs prior,
  strengthening/weakening/little changed) rather than a second number in an already-dense 6×6
  grid — progressive disclosure per the minimalist-design default.

### ✅ Done (`0462538e`) — P&L calculator has no risk context
- `app/tools/mcx-pl-calculator/PLCalculatorClient.tsx:31-33` computes raw
  `(sell-buy) × lotSize × lots` only. Margin is an outbound link to a separate, unconnected tool
  (line 131) — nothing computed inline.
- Shipped: `lib/plRisk.ts` (notionalExposure, adverseMoveImpacts) wired in — notional exposure
  and the ₹ impact of a 1%/3%/5% adverse move, from inputs already entered. Margin left as the
  outbound link — no margin engine exists to compute it inline.

### ✅ Done (`36036b62`) — IV Rank page: missing IV-RV spread + delta-matched skew
- Note first: a trend chart (`IVRankHistoryChart`, up to 90 days) and a strike-based skew chart
  (`IVSkewChart`) **already exist** on `app/tools/mcx-iv-rank/page.tsx` — the audit's framing of
  this page as a bare snapshot was exaggerated. Neither was rebuilt.
- Shipped: each instrument row now shows IV−RV in percentage points alongside the 20d realized
  vol figure, reusing the `aav['20d']` value already fetched via the same `getOptionsChain()`
  call used for live IV — no second fetch. Delta-matching the skew chart was left as a larger,
  separately-scoped change, not bundled in here.

### ✅ Done (`4421da4a`) — Strategy Builder: missing IV-shock what-if control
- Note first: **net Greeks already exist**, aggregated across all legs
  (`components/mcx/StrategyBuilder.tsx:1516-1532` — Net Delta, Delta ₹ Exposure, Net Gamma, Net
  Theta/day in ₹, Net Vega/1% in ₹, via `computeNetGreeks`), and a before-expiry scenario line
  already exists (`EventTimeline`, lines 391-440 — click a preset event date to see an "as of"
  P&L line via `secondaryPayoff`). The audit's claim of per-leg-only Greeks and expiry-only
  payoff was wrong; neither was touched.
- Shipped: a small IV input next to the payoff chart, reusing `computePayoff`'s existing
  `liveIV` override parameter (already used to price the Today/As-of line) instead of new
  pricing logic. Defaults to live IV, with a "Reset to live" control; applies whether or not a
  target date is selected.

## Sequencing

Tier 1 → Tier 2 → Tier 3: all shipped, one commit per item, in that order, including Calendar's
surprise-conditioning (resolved via a self-referential trailing-average baseline rather than
external consensus — see that section). Nothing left open from this roadmap.

## Calendar coverage audit (2026-09-26)

A follow-up ask, separate from the roadmap above: audit every calendar event (India + global)
for actual relevance to the commodities BhaavBrief covers, and set up an ongoing weekly
mechanism so a newly-relevant event doesn't get missed. Full research is in the approved plan
this was built from; summary of what shipped:

**Removed** (`381dea99`) — `usda_wasde`, `mpob_palm_oil_stocks`: neither maps to any MCX
contract this product tracks (`affected_contracts: []` on both, confirming they were never
wired to anything) — legacy leftovers from a broader plan `project-founding-principles`'
"Agri is v2.0" line later scoped out.

**Upgraded** (`b01d8570`) — `cftc_cot_report` now has `recent_values` (and surprise-conditioning)
for the 5 commodities that actually trade on a CFTC-jurisdiction exchange: gold, silver, copper
(COMEX), crude (NYMEX WTI-Physical), natgas (NYMEX). Required migrating `recent_values` from a
flat array to an object keyed by commodity (`lib/eventMapTypes.ts`, with matching changes in
`compute-event-impact.mjs`, `fetch-eia-data.mjs`, and `validate-event-map.mjs`'s schema check) —
COT covers 9 commodities per event with genuinely different series, unlike EIA's one-event-one-
commodity shape. zinc/aluminium/lead/nickel positioning is tracked by the LME's own COTR (a UK
exchange, not CFTC), which requires a licensed distributor — same access constraint as LME
warehouse data below, not built.

**Added** (`8a8c7d0d`, `53843611`, `6a08c236`):
- `us_pce_price_index` — the Fed's own preferred inflation gauge, absent despite mattering more
  than CPI for rate-path expectations. Seeded with BEA's real published next release
  (2026-09-30), confirmed live against bea.gov.
- `akshaya_tritiya`, `dhanteras`, `diwali` — India festival gold-demand dates, named directly in
  `project-founding-principles`' own vision doc but never actually tracked. Not data releases —
  lunar-calendar (tithi) dates from the published Hindu panchang, seeded with real confirmed
  2026/2027 dates.
- `us_ism_manufacturing_pmi` — completes the industrial-demand PMI trio alongside China's
  NBS/Caixin readings. No automated actuals feed: ISM's own real-time data isn't freely
  API-accessible, and FRED republishes it but this session didn't confirm same-day latency —
  noted honestly in the entry rather than built on an unconfirmed assumption.

**Researched, not built** (free/official-only scope, confirmed this session):
- OPEC Monthly Oil Market Report — free PDF from opec.org, no structured API (PDF-parsing
  engineering, a bigger lift than the API-based fixes above).
- IEA Oil Market Report — subscription service; only one edition a year is free.
- LME warehouse stock data and LME's own COTR — real-time/structured access goes through
  licensed data distributors, not a free public API.
- India gold import data (DGCIS) — confirmed official government source, but a query-based web
  portal, not a REST/JSON API; scraping it would be a materially bigger, more fragile lift than
  the EIA/CFTC-style fixes. Revisit if DGCIS ever exposes a real API.

**Weekly new-event discovery** — a scheduled Claude Code cloud routine,
[BhaavBrief Calendar Watch](https://claude.ai/code/routines/trig_013PwyfpKjLVvWwnme34rWtz)
(Wednesdays ~9 AM IST, deliberately offset from the existing Monday data-fetch pipeline), reads
`data/event-map.json` live, researches for new/changed events, and emails a digest to
`00tradingview00@gmail.com` via the Gmail connector — it never edits the repo. Distinct from
`.github/workflows/refresh-event-impact.yml`'s existing staleness check, which only catches
date-drift on events already tracked, not new event types.
