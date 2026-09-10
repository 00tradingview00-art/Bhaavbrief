# BhaavBrief — repo guide for Codex

This is the OpenAI-agent (Codex) counterpart to `CLAUDE.md`. The facts below are shared with
that file — read whichever one your tool loads, they should never diverge on anything factual.
Codex itself runs on OpenAI's models; **the app's own AI stack is Anthropic Claude** (brief
generation + semantic validation) plus ElevenLabs (reel voiceover) — see Stack below.

MCX commodity intelligence for Indian traders: a daily AI-generated market brief, a live
options chain (Black-76), and a price bridge/import-parity engine, published on a
GitHub Actions cron pipeline to Next.js/Vercel.

## Stack

- **App:** Next.js 15 App Router, TypeScript, Vercel deployment.
- **Content pipeline:** GitHub Actions workflows (`.github/workflows/*.yml`) run Node scripts
  (`scripts/*.mjs`/`.js`) on a cron, commit generated content straight to `main` — see Part 8.5
  below on why direct-to-main is deliberate here, not an oversight.
- **AI:** Anthropic Claude for brief generation + semantic validation; ElevenLabs for reel
  voiceover.
- **Data:** Kite Connect (MCX/NSE), Yahoo Finance (COMEX/FX fallback), Redis (options IV
  history), flat JSON files under `data/` (no database).
- **Tests:** Vitest (`npm test`) — introduced 2026-07 alongside the observability/gate work;
  coverage is real but not exhaustive, growing per-change.

## C-01 ownership map — one module per fact, don't re-derive elsewhere

| Fact | Owning module | Notes |
|---|---|---|
| Prices/FX | `lib/snapshot.ts` (brief generators, gate, email) | `lib/prices.ts` is a second, independent live-fetch path still used by the ticker/`\/api\/prices` — a known, documented C-01 gap, not yet consolidated. See the header comment in `lib/snapshot.ts`. |
| Import parity/duty conversion | `lib/parity.mjs` | `.mjs`, not `.ts` — called from a plain Node script (`scripts/fetch-snapshot.mjs`) that can't import TypeScript directly. |
| Holidays / trading calendar | `lib/tradingCalendar.ts` → `scripts/lib/holidays.js` | The IST-anchor date logic lives once in `holidays.js`; don't reimplement `isWeekend`/`todayIST` elsewhere — a duplicate copy in `app/api/health/route.ts` caused a real Monday-detection bug (fixed 2026-07). |
| Risk-free rate | `lib/options.ts` (`RISK_FREE_RATE`) | Single hardcoded monthly constant today, no live MIBOR feed yet. |
| Event calendar | `data/event-map.json` via `lib/eventMap.ts` | |
| Claims ledger | `scripts/lib/buildClaimsLedger.mjs` → `data/claims.json` | Brief generator may only cite claims from here — never invented statistics. Backstopped by `scripts/lib/claimsCheck.mjs` (G-07) in both publish gates — see Part 9. |
| Route manifest | `config/routes.mjs` | CI-enforced (`scripts/check-route-manifest.mjs`) — see Part 5. |
| ISR revalidate windows | `config/revalidate.mjs` | CI-enforced (`scripts/check-revalidate-policy.mjs`) — literal values only, Next can't resolve an imported constant for `export const revalidate`. |

## The gate is sacred

`scripts/validate-brief.mjs` (and `scripts/validate-research.mjs` for Pro Research articles) is
the publication gate — **never bypass it, never weaken a check to make a specific brief pass.**
If a check is wrong, fix the check with a real test proving the fix, in its own change. The
gate's exit-code contract matters: 0 = publish, 1 = a legitimate content rejection (stay silent,
working as intended), 2 = the gate itself couldn't run (must alert a human — this is the class
of bug that caused a real 51-day silent failure before the Part 3/4 work landed).

The G-12 human-approval gate (`scripts/apply-human-gate.mjs`) sits after the publish gate and
is dormant until `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` secrets exist — see
`docs/runbooks/g12-human-gate-setup.md`.

## Commands

```
npm test              # vitest — run before every commit
npm run lint           # next lint
npx tsc --noEmit -p .  # type-check
npm run build           # full production build — do this before any commit touching app/
node scripts/check-route-manifest.mjs      # P-02
node scripts/check-revalidate-policy.mjs   # P-03
```

There is no separate "staging" environment beyond Vercel preview deployments (P-05's PR
discipline is not adopted for automated content commits — see below); `MONITOR_BASE_URL` env
var lets `scripts/synthetic-monitor.mjs`/`scripts/send-telemetry-digest.mjs` be pointed at a
preview URL instead of production for manual testing.

## Working conventions (Part 8.5)

- **One defect/feature per commit**, verified (tests + lint + tsc + build) before the next.
  Interleaved fixes are how silent regressions happen.
- **Direct commits to `main` are deliberate for the automated content pipeline** — the
  cron-driven workflows (`generate-brief.yml`, `evening-close-brief.yml`, etc.) commit straight
  to `main` by design; this is the master doc's own "solo-founder version" of P-05, not a
  shortcut taken by accident. Code changes made interactively (not by the cron pipeline) can
  go through a PR if you want that reviewed first — just say so.
- **Never let it "clean up while it's there."** Scope creep during an AI-assisted change is the
  most common source of silent regressions in this repo's history (see
  `docs/postmortems/2026-05-27-feed-death.md`, the founding postmortem) — diff review every
  change against what was actually asked.
- **Verify before/after, not just after.** Reproduce the bug or confirm the current behavior
  first, then fix, then re-verify — especially for anything touching the live-serving price or
  options-chain paths (`lib/snapshot.ts`, `lib/prices.ts`, `lib/options.ts`, `lib/black76.ts`).
- Cross-boundary imports: `scripts/*.mjs` (plain Node, run by GitHub Actions) cannot import
  `.ts` files directly. Shared logic that both a script and app/ TypeScript code need lives in
  a plain `.js`/`.mjs` module under `lib/` or `scripts/lib/` (tsconfig has `allowJs: true`, so
  TS can import these; the reverse — a script importing `.ts` — does not work without adding a
  TS-execution runtime, which this repo deliberately hasn't done).

## Working alongside Claude Code (Part 9)

Claude Code is the primary/default driver on this repo — it already has the discipline above
baked in (verify-before/after, one-defect-per-commit, the postmortem history). When you (Codex)
are brought in alongside it:

- **Don't run a concurrent session in the same working tree Claude Code is using.** The cron
  pipeline commits straight to `main` (Part 8.5) — tuned for one agent editing at a time. Work
  in a separate `git worktree` (this repo already uses `.claude/worktrees/*` for exactly this
  kind of parallel work) or a cloud task, so your changes land as a diff to review rather than
  racing another agent's edits.
- **Your best fit here**: independent review of risk-sensitive changes (anything touching
  `lib/snapshot.ts`, `lib/prices.ts`, `lib/options.ts`, `lib/black76.ts`,
  `scripts/validate-brief.mjs`), and self-contained cloud-task work run in parallel with
  whatever Claude Code is doing.
- **Deep Research output** (market/policy research for `scripts/generate-research.mjs`'s
  `--context` argument) is fine to feed in directly. It is **not** a substitute for
  `data/claims.json` — see Part 9.1.
- **Computer-use / browser control** is for occasional manual lookups only (e.g. an exchange
  notice not covered by an existing `monitor-*.js` script). Never wire it into a GitHub Actions
  workflow — nondeterministic browser runs have no place in the cron pipeline, which already
  automates circular monitoring (`scripts/monitor-mcx-circulars.js`, every 15 min via Claude).
- Both Claude Desktop and the ChatGPT app may end up with the same connectors (Gmail, Google
  Calendar) enabled — be deliberate about which agent actually sends/edits vs. just reads.

### Part 9.1 — the rule that holds no matter which agent wrote the draft

**Every statistic in a draft must either match a `data/claims.json` record, or be removed, or
be explicitly labeled as analysis.** This applies whether Claude, Codex, or a Deep-Research
paraphrase produced the sentence. The label convention: append `*(analysis)*` or
`<!-- analysis -->` immediately after a sentence that states an interpretive/typical pattern
without citing a real dataset — e.g. "...this often precedes a pullback. *(analysis)*". An
unlabeled statistic that isn't in the ledger will be rejected by `checkClaims` in
`scripts/lib/claimsCheck.mjs` (G-07), which both `validate-brief.mjs` and `validate-research.mjs`
run.
