# Part 6 data architecture — what's enforced and what's a known gap

## C-01 — single source of truth
- Holidays, risk-free rate, event calendar, and claims ledger each have one clear owning module (see `lib/tradingCalendar.ts`, `lib/options.ts`, `lib/eventMap.ts`, `scripts/lib/buildClaimsLedger.mjs`).
- **Known gap, deliberately not fixed here:** prices/FX have two independent implementations — `lib/snapshot.ts` (cron-refreshed `data/market-snapshot.json`, what brief generators/the gate/email read) and `lib/prices.ts` (a second live-fetch path actually used by `app/api/prices/route.ts` and the ticker). See the honesty note at the top of `lib/snapshot.ts` for the full picture. Consolidating them is a real improvement but touches the live-serving ticker path — too risky to do as a side effect of a data-architecture audit. `scripts/synthetic-monitor.mjs`'s M-06 check exists partly to catch the two paths disagreeing in production until this is properly merged.

## C-02 — typed data contracts
`scripts/lib/snapshotSchema.mjs` (zod) validates every snapshot before `scripts/fetch-snapshot.mjs` writes it: field presence/type via schema, plausible price range and max single-run % change per instrument. A violation quarantines the write — `data/market-snapshot.json` is left untouched, the bad payload goes to `data/quarantine/` (gitignored, debug-only), and the script exits 1 (which the existing "Alert on failure" step in `generate-brief.yml`/`evening-close-brief.yml` already catches, no new alert plumbing needed).

To widen coverage: update `PLAUSIBLE_RANGES` in `scripts/lib/snapshotSchema.mjs` if a real, sustained market move ever pushes a price outside its band — that's a legitimate range update, not a workaround.

## C-03 — provenance
Snapshot-level provenance exists (`generatedAt`, `generatedAtIST`, `source`), read by `lib/snapshot.ts`'s staleness helpers. Per-field `{value, source, fetched_at, method}` does not exist — would require a data-model migration touching every consumer of `data/market-snapshot.json`. Not attempted this pass; flagged as a future improvement, not a currently-broken thing.

## C-04 — unit discipline
`lib/parity.mjs` is now the one tested module for gold/silver import-parity conversion (`computeImportParityGoldINR`, `computeImportParitySilverINR`, `computeSpreadPct`, `computeGoldSilverRatio`, `checkParityWedge`) — `scripts/fetch-snapshot.mjs` calls it rather than inlining the formula. `.mjs`, not `.ts` (the master doc's literal name): the primary caller is a plain Node script outside Next's TypeScript loader, and this repo's existing convention (`scripts/lib/holidays.js` imported by `lib/tradingCalendar.ts`) already relies on plain JS modules being importable from both sides.

## C-05 — historical store
`scripts/lib/historicalStore.mjs` archives the validated snapshot to `data/history/YYYY-MM-DD.json` on every successful `fetch-snapshot.mjs` run — overwrites *today's* file each time (the script runs several times a day), never touches a prior day's file once the date rolls over. Wired into the commit steps of `generate-brief.yml`, `evening-close-brief.yml`, and `intelligence-engine.yml`.

Not yet wired up: `scripts/compute-event-impact.mjs` still hits Kite's live historical API directly rather than reading from `data/history/`. Switching it over is a natural follow-up once enough days have accumulated in the archive to be useful — not done here since the archive didn't exist before this pass.
