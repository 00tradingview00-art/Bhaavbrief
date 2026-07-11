# Incident Runbook — BhaavBrief

This site's content pipeline runs entirely on GitHub Actions; hosting is entirely on
Vercel. Neither has a redundant standby. The one thing that IS independent of both is
external alerting, set up below, so a failure in either gets noticed even if the
GitHub-hosted watchdogs (`keepalive.yml`, `watchdog.yml`) can't fire (e.g. during a
GitHub-wide outage).

## External monitor setup (one-time, ~10 min)

Sign up for a free-tier uptime monitor — UptimeRobot or Better Uptime — and add two
HTTP(S) monitors:

1. `https://bhaavbrief.in` — plain root URL, expect HTTP 200.
2. `https://bhaavbrief.in/api/health` — expect HTTP 200. This endpoint returns 503 when
   any part of the pipeline (price data, daily brief, intelligence engine) has gone
   stale — see response shape below.

Check interval: 5 minutes (free tier default). Alert contact: email to
`00tradingview00@gmail.com` (add SMS too if the plan allows).

## `/api/health` response shape

```json
{
  "ok": true,
  "checks": {
    "snapshot": { "ok": true, "ageMinutes": 12, "marketOpen": true, "generatedAtIST": "..." },
    "brief":    { "ok": true, "reason": "..." },
    "engine":   { "ok": true, "ageMinutes": 8, "marketOpen": true }
  },
  "timestamp": "..."
}
```

`ok: false` on any individual check drops the top-level `ok` to `false` and the HTTP
status to 503.

## What each alert means

**Root URL (`bhaavbrief.in`) down / not responding**
Vercel outage or DNS issue — check https://www.vercel-status.com. GitHub Actions can
keep generating content in the meantime (it's independent of Vercel); once Vercel
recovers, the site will show whatever was generated during the outage.

**`/api/health` returns 503 with `checks.snapshot.ok: false`**
Price data is stale beyond the market-hours-aware threshold (>2h during MCX hours,
>12h outside). Most likely cause: the daily Kite token refresh was skipped or failed.
Fix: `node scripts/kite-morning-auth.js` (the existing daily manual step).

**`/api/health` returns 503 with `checks.brief.ok: false`**
No brief was published today by 10:00 AM IST on a trading day (weekends and dates in
`data/market-holidays.json` are already excluded, so this only fires on a real trading
day). Check the GitHub Actions tab for `generate-brief.yml` — if it didn't run or
failed, manually trigger it via `workflow_dispatch`.

**`/api/health` returns 503 with `checks.engine.ok: false`**
The intelligence engine has been silent for over an hour during MCX market hours.
Check the Actions tab for `intelligence-engine.yml` — look for a stuck git
push/rebase loop (the workflow retries commits up to 3x; a 4th consecutive collision
would stall it) or an Anthropic API outage (steps use `continue-on-error`, so the
workflow itself should still complete and commit a snapshot-only update — a full stall
usually means something else broke).

**Anthropic/Claude API outage (no direct alert — inferred)**
All content-generation workflow steps that call Claude use `continue-on-error: true`,
so a Claude outage does not fail the workflow — it just means no new brief/flash/
article gets written that run. The two live user-facing routes that call Claude at
request time (`/api/commodity-pulse`, `/api/search`) both fail open to non-AI
fallback responses, so the site keeps working. If several consecutive `/api/health`
`brief`/`engine` checks fail together with no corresponding GitHub Actions failure
logged, suspect this.
