# Incident runbooks (Part 9)

Each runbook below assumes the alerting built in Part 4 has already fired (a GitHub Issue
labeled `monitor-incident`, and/or a Telegram message if `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`
are configured). If you're reading this because something looks wrong and nothing alerted,
that gap is itself the incident — file it, then check whether a Part 4 check should have
caught it and didn't (see the note at the bottom of each runbook).

---

## R-01 — Brief missing at 9:45 AM IST (dead-man's switch fired)

Trigger: `scripts/synthetic-monitor.mjs`'s M-03 check (`/briefs` still shows the delayed-edition
banner past 9:45 IST on a trading day), or `.github/workflows/watchdog.yml`'s 9:45 AM check.

1. **Was generation attempted?** Check `data/gate-log.jsonl` for a `gate_run` entry with
   today's date. If present:
   - `clean: false` with `blockerCount > 0` → the gate correctly rejected bad content. Read
     the blocking issue(s) — printed in the `Validate brief (publish gate)` step's job log —
     and decide: fix the data/payload issue and re-run
     (`gh workflow run generate-brief.yml`), or if it's a content-quality issue in the prompt,
     fix `prompts/brief_v1.md` (bump to `brief_v2.md` per Part 8.2's versioning rule) separately.
   - `hasInternalError: true` → the gate itself couldn't run a check (upstream API failure,
     malformed snapshot). This should already have alerted via `generate-brief.yml`'s
     `GATE_INTERNAL_ERROR:` exit-code-2 path — if it didn't, that alerting logic itself is
     broken and is the priority fix.
2. **If no `gate_run` entry exists at all today** — generation was never attempted:
   `gh run list --workflow=generate-brief.yml --created $(date +%Y-%m-%d)` to check whether the
   scheduled run fired. If it didn't run: check GitHub Actions status
   (status.github.com), then `gh workflow run generate-brief.yml` to trigger manually.
   `watchdog.yml` already does this automatically for the missing-brief case — check whether
   its auto-recovery step ran and failed, vs. never fired.
3. The site shows the delayed-edition banner automatically (`app/briefs/page.tsx`,
   `isTodaysBriefDelayed`) — no manual action needed for the public-facing side while you
   investigate.
4. **Postmortem required** if this was a genuine S1 (not a transient API blip resolved by
   the gate's own retry) — see the postmortem template below.

---

## R-02 — Two-builds / stale-route alert (M-01 / M-02)

Trigger: `scripts/synthetic-monitor.mjs`'s M-01 (bb-build meta tag differs across `/`, `/briefs`,
`/options`) or M-02 (homepage ticker "as of" timestamp missing during market hours).

1. Identify the divergent route from the monitor's JSON payload (attached to the incident
   issue) — `results.buildIds` shows which route(s) disagree.
2. Check the Vercel dashboard's Deployments tab: is there more than one deployment currently
   aliased to production, or is the affected route serving from a deployment older than the
   latest one?
3. Confirm which build is actually serving the bad route: `curl -s https://bhaavbrief.in<route>
   | grep bb-build`.
4. Redeploy from the latest commit on `main` (a fresh Vercel deployment, or an empty commit to
   trigger one). `config/routes.mjs` (P-02) guarantees the route set itself is correct — this
   is a serving/deployment issue, not a missing-route issue.
5. Verify the fix: re-run `node scripts/synthetic-monitor.mjs` (or wait for the next scheduled
   run) and confirm `bb-build` matches across all three cross-check routes.
6. Postmortem required.

---

## R-03 — Data feed divergence (G-01 / G-02 / M-06 / C-02 quarantine)

Trigger: `scripts/lib/snapshotSchema.mjs` quarantines a `fetch-snapshot.mjs` write (job fails,
`data/quarantine/snapshot-*.json` written), the gate's `PARITY_WEDGE_DIVERGENCE` warning fires,
or M-06 (cross-page gold price mismatch) fires.

1. If quarantined: read the quarantine file's `errors` array — it names exactly which
   instrument(s) and which check (schema vs. plausible-range vs. change%) failed. The last
   good `data/market-snapshot.json` was left untouched, so the site is still serving
   yesterday's-or-earlier valid data, not garbage.
2. Compare the quarantined payload's raw instrument values against the source: Kite quotes
   (`scripts/fetch-snapshot.mjs`'s Kite calls) vs. the Yahoo Finance fallback — which one
   produced the implausible number?
3. Identify the wrong feed. If it's a genuine, sustained market move that happens to exceed
   `PLAUSIBLE_RANGES` in `scripts/lib/snapshotSchema.mjs`, widen that specific instrument's
   range (with a comment explaining why) rather than leaving the pipeline blocked.
4. If the rest of the snapshot is fine, you can manually re-run `node
   scripts/fetch-snapshot.mjs` once the feed recovers — the next successful run auto-clears
   the quarantine (there's no separate "un-quarantine" step, since quarantine files are debug
   artifacts, not a blocking state on their own).
5. If a bad value made it through undetected (a real gap in `PLAUSIBLE_RANGES`), that's the
   priority follow-up: widen or add the missing range check, with a test in
   `scripts/lib/snapshotSchema.test.mjs` reproducing the exact bad value that got through.
6. Postmortem required.

---

## R-04 — Options JUNK% spike (weekly sanity report)

Trigger: `scripts/lib/optionsSanity.mjs`'s weekly digest section flags `JUNK% elevated` for an
instrument (>20% of strikes).

1. Compare quote-feed timestamps for that instrument's option chain — is Kite's data actually
   stale, or is this expected (outside MCX trading hours, low-liquidity far-OTM strikes)?
2. Check MCX/Kite vendor status if the JUNK% spike is during active trading hours and
   unexpected.
3. If the classification thresholds in `lib/options.ts` (`classifyQuote`'s spread/liquidity
   bounds) are miscalibrated for current conditions, raise them *temporarily* with a code
   comment stating why and a plan to revisit — don't silently leave a permanently loosened
   threshold.
4. `components/mcx/OptionChain.tsx` already annotates hidden/JUNK strikes with a "show hidden
   strikes" toggle rather than silently rendering bad data as if it were tradeable — confirm
   this is still working as expected rather than building a new UI treatment.
5. No postmortem required unless it correlates with a real data-quality incident (R-03).

---

## R-05 — Correction to a published brief

1. Fix the content in `content/briefs/edition-NNN.mdx`.
2. Bump the frontmatter: `corrected: true`, `correctedAt: <ISO timestamp>`, and a one-line
   `correctionNote` describing what changed and why (see `lib/briefs.ts`'s `BriefMeta` and
   `app/briefs/[slug]/page.tsx`'s correction banner — already built, this just needs the
   frontmatter populated).
3. The correction banner renders automatically on the brief page — no separate changelog
   mechanism needed.
4. If the original error was material (a wrong number that could have misled a reader, not a
   typo), note the correction in the next day's brief per the master doc's own rule.
5. This doesn't currently write a dedicated `gate-log.jsonl` entry for the correction itself —
   the correction is visible in the git history and the frontmatter/banner. A follow-up could
   add a `type: 'correction'` gate-log record if this needs to feed the weekly digest later.

---

## If a check should have caught this and didn't

That's the priority fix, ahead of the immediate incident — file it as its own follow-up with a
test reproducing the miss, per Part 10's rule: "a postmortem that doesn't produce a new
automated check is a diary entry."
