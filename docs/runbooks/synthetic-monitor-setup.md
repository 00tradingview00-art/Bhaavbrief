# Synthetic monitor (Part 4, M-01..M-06) — what it checks and how to read an alert

`scripts/synthetic-monitor.mjs` runs every 15 minutes from `.github/workflows/synthetic-monitor.yml`,
hitting **production URLs directly** (`https://bhaavbrief.in` by default) — it checks what a user
actually sees, independent of whatever the content pipeline believes it did. This is the layer that
would have caught the May 27 feed death in minutes instead of 51 days.

## Checks

| ID | What | Fires when |
|----|------|------------|
| M-01 | Build-ID uniformity | `/`, `/briefs`, `/options` don't all serve the same `bb-build` meta tag, or any of them isn't HTTP 200 — two builds serving simultaneously |
| M-02 | Ticker liveness | Homepage ticker's "as of" timestamp is missing during MCX market hours |
| M-03 | Dead-man's switch | `/briefs` still shows the "today's edition is delayed" banner past 9:45 AM IST on a trading day |
| M-04 | Feed freshness | `/feed.xml`'s newest item is more than 24h old on a trading day |
| M-05 | Risk-free-rate staleness | `/options`'s displayed risk-free-rate "as of" month isn't the current month |
| M-06 | Cross-page consistency | MCX gold price on `/`, `/briefs`, `/options` diverges by more than 1% |

## On a new incident

The workflow opens a GitHub Issue labeled `monitor-incident` with the full JSON report attached, and
(if `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` are configured — see
[g12-human-gate-setup.md](./g12-human-gate-setup.md), same bot) pings Telegram once. Repeat 15-minute
runs while the incident is still open only add a comment to the existing issue — no repeat Telegram
ping, per the alert-fatigue rule (a check that pages twice for the same unresolved thing trains you to
ignore it).

1. Open the linked issue, read the JSON payload — the specific `issues[]` array tells you which M-check
   fired and the raw values it saw.
2. Match the check ID to R-02 (build/route issues) or R-03 (data/price divergence) in the main runbook
   set once Part 9 lands, or just fix the underlying page/deploy directly.
3. The issue auto-closes with a "recovered" comment the next time all checks pass — no manual close
   needed once the underlying problem is fixed.

## Weekly digest

`scripts/send-telemetry-digest.mjs` (`.github/workflows/telemetry-digest.yml`, Fridays) summarizes the
week: gate pass rate from `data/gate-log.jsonl`, monitor incident count from the GitHub Issues API, and
edge-ledger track record — sent to the same Telegram chat. Dormant (logs only, no send) without the
Telegram secrets, same as everything else in this pipeline.

## Local testing

```
MONITOR_BASE_URL=https://bhaavbrief.in node scripts/synthetic-monitor.mjs
```

Exits 0 with a JSON report on all-clear, 1 with the failing checks listed on any issue. Point
`MONITOR_BASE_URL` at a Vercel preview URL to test against a branch before merging.
