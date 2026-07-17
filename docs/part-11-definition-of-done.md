# Part 11 — Definition of Done, final review (2026-07-18)

Honest status against the master doc's own Part 11.3 checklist, verified live against
production where possible (not just "the code exists"), at the end of this remediation effort.
Legend: ✅ live and verified · ⚠️ built but not fully active/proven · ❌ genuinely not done ·
🔵 verified as never having been a real bug.

## 11.3 checklist

- **✅ All S1 fixes (FIX-01…05, 09 + FIX-03) live with passing acceptance tests**
  - FIX-01/D-01 (`/news` stale): live-verified today — `bb-build` meta tag now identical across
    `/`, `/news`, `/briefs`, `/options`; the ticker shows current live prices, not the frozen
    May-27 values; the one remaining "2026-05-27" string on the page is a correctly-dated
    historical article in the JSON-LD feed, not a mislabeled "Today."
  - FIX-02/D-02 (silver parity): `importParitySilverINR`/`mcxComexSilverSpreadPct` live in
    `data/market-snapshot.json`'s `derived` block; the `PARITY_WEDGE_DIVERGENCE` warning fired
    correctly on a real dry run this session.
  - FIX-03/D-03 (false "before session opens" claim): copy corrected across `app/page.tsx`,
    `app/about/page.tsx`, `components/BriefGate.tsx`, `components/SubscribeForm.tsx`; a fresh
    grep during this review found one unrelated match (`mcx-margin-calculation` page, about
    broker margin-call notices, not BhaavBrief's own publish time) — not a recurrence.
  - FIX-04/D-04 (cadence integrity): retry + `GATE_INTERNAL_ERROR:` alert routing shipped;
    `evening-close-brief.yml` now has the `concurrency:` block it was missing.
  - FIX-05/D-05, FIX-09/D-09: verified during the original audit pass to never have been real
    bugs (archive count and USDINR value both matched live computation, no hardcode existed) —
    no code change was the correct outcome, not a gap.

- **⚠️ Publication gate blocking on all G-checks; human approval flow active**
  - G-02 through G-11 block on failure; G-01 (parity cross-check) is **deliberately warn-only**,
    not hard-blocking — an explicit user decision (recorded earlier in this session) made
    because hard-blocking would have stopped the very next trading day's brief on a check with
    no live production track record yet. Revisit once the warning has run clean for a while.
  - G-12 (human approval gate) is **built and dormant**, not active — by design, it stays
    dormant until `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` repo secrets exist (see
    `docs/runbooks/g12-human-gate-setup.md`). **This needs you to create a Telegram bot and add
    the two secrets before this checklist item can move to ✅.**

- **⚠️ Synthetic monitor running ≥ 96 checks/day with Telegram alerting proven by a staged failure**
  - The workflow (`synthetic-monitor.yml`, `*/15 * * * *` = 96/day) is registered and active on
    GitHub; manually triggered during this review and it completed successfully in 33s against
    live production. Its first *scheduled* run hadn't fired yet at review time — a known
    GitHub Actions first-activation delay for newly-added cron schedules, not a bug (confirmed
    the workflow itself works via the manual trigger).
  - **Found and fixed two real bugs during this same review**, not before: `post-deploy-smoke.yml`
    was hitting Vercel's SSO-protected per-deployment URL (100% failure since it started
    running) instead of the public domain, and the `monitor-incident` GitHub label didn't exist
    (so incident-issue creation was erroring out even before reaching the Telegram step). Both
    fixed and pushed; see the `fix:` commit.
  - "Proven by a staged failure" specifically has **not** been done — that requires either a
    deliberately broken deployment or Telegram secrets configured to see a real alert land.
    Dry-run/unit-test coverage is thorough (synthetic-monitor.test.mjs, manual dry runs against
    live prod throughout this session), but a true staged-failure proof is still open.

- **✅ Build-ID stamping + route manifest in CI**
  - `app/layout.tsx`'s `bb-build` meta tag confirmed live and consistent across routes today.
  - `config/routes.mjs` + `scripts/check-route-manifest.mjs` run in `test.yml` on every push/PR;
    verified it fires on both a missing-from-manifest and an orphaned-in-manifest route during
    development.

- **✅ Options tiering + dated risk-free live**
  - LIVE/STALE/JUNK tiering, per-strike parity demotion, and the no-arbitrage pre-filter were
    already live before this remediation phase (earlier session work). `RISK_FREE_RATE_ASOF`
    confirmed live and current ("2026-07") via a direct fetch of `/options` today.
  - Added this session: `calculateIV` now returns `null` on a non-convergent solve instead of a
    clamped 0.1%/500% — confirmed this was a live bug via a real cached CRUDEOIL ATM-IV history
    value of 0.8%, almost certainly an artifact of the old behavior.

- **✅ `/methodology` + claims ledger live; generator constrained to ledger**
  - `/methodology` renders the claims ledger live; `scripts/lib/claimsCheck.mjs` blocks the gate
    on an unbacked statistical claim; `generate-brief.js`'s prompt (now `prompts/brief_v1.md`)
    carries the hard constraint to only cite `<claims_allowed>` entries.

- **✅ Yesterday's Edge loop live with structured ledger**
  - `scripts/lib/edgeLedger.mjs`, `/track-record` page, G-08 edition-continuity check all live.
  - `data/edge-ledger.json` doesn't exist yet on disk — it's created on first real append
    (`resolveYesterdaysEdge` only fires once a prior day's edge exists to resolve against), so
    an empty/absent file at this point in time is the correct state, not a bug.

- **✅ Prompt architecture (8.2–8.4) deployed; `CLAUDE.md` in repo**
  - `prompts/brief_v1.md` extracted and verified byte-for-byte equivalent to the prior inline
    template before the inline version was deleted. `data/gate-log.jsonl` now carries
    `generation_call` records (prompt version, model, tokens, latency, payload hash) for all
    three Claude calls in `generate-brief.js`. `CLAUDE.md` written with the stack summary, C-01
    ownership map, "the gate is sacred," and verification commands.
  - Not yet exercised in production: `data/gate-log.jsonl` is still empty on the live repo as
    of this review — no `generate-brief.js` run has happened since this logging was added. Will
    populate on the next scheduled brief.

- **✅ Founding postmortem written**
  - `docs/postmortems/2026-05-27-feed-death.md` — root-caused from direct evidence gathered
    during this remediation (not the original audit's unconfirmed race-condition theory),
    5-whys to "zero observability existed," every Part 3–5 control mapped to the specific link
    in the chain it now closes.

- **✅ Email capture live on brief pages**
  - `EmailCaptureModal` confirmed wired into `app/briefs/[slug]/page.tsx` (dwell/scroll
    trigger, 7-day `localStorage` cap, skips if already subscribed).

- **❌ 30 consecutive clean editions → auto-publish earned**
  - Correctly not met — `data/gate-streak.json` shows `consecutiveCleanPasses: 0`. This can
    only start accumulating once G-12 is active (Telegram secrets configured), and 30 clean
    trading days is a multi-week clock even after that. Expected state, not a gap to close now.

## What needs your action (not something further code can fix)

1. **Create a Telegram bot and add `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` as repo secrets** —
   see `docs/runbooks/g12-human-gate-setup.md`. This single action activates: the human-approval
   gate (G-12), Telegram alerting for synthetic-monitor incidents, and the weekly telemetry
   digest's send step. Everything is built and dormant waiting on this.
2. **Optional, for true no-promote blocking (full P-04)**: configure Vercel's own Deployment
   Protection / Checks feature in the Vercel dashboard — this repo's CI cannot enable that
   setting itself.
3. Let the pipeline run a few real days to populate `data/gate-log.jsonl` and confirm the
   weekly digest (`telemetry-digest.yml`, Fridays) produces a sensible real-data report — it
   was only dry-run against live-but-mostly-empty data during this session.

## Known, deliberately-deferred gaps (documented, not silently dropped)

- **C-01**: `lib/prices.ts` and `lib/snapshot.ts` remain two independent price-fetch paths —
  a real single-source-of-truth gap, not fixed here because it touches the live-serving ticker
  path and was judged too risky to fold into a data-architecture audit. `lib/snapshot.ts`'s
  header now states this honestly instead of the previous (false) "only place" claim.
- **C-03**: per-field `{value, source, fetched_at, method}` provenance doesn't exist — only
  snapshot-level provenance (`generatedAt`, `source`). Would require a data-model migration
  touching every consumer.
- **P-05**: PR-based review isn't adopted for the automated content pipeline's direct-to-main
  commits — the master doc's own "solo-founder version" text endorses this explicitly.
- **G-01**: warn-only per explicit user decision, not yet hard-blocking.
