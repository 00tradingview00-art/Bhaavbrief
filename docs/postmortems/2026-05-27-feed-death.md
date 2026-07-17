# 2026-05-27 — /news feed death, 51-day detection lag

**The founding postmortem.** Keep this as the document to reread whenever skipping a gate
feels tempting — everything built in Parts 3–5 of the engineering master doc exists because of
what's described below.

## What happened

`/news` served content dated 2026-05-27 — labeled "Today" / "7h ago" by the page's own relative
time formatting — continuously from that date until the 17-Jul-2026 external audit discovered
it: 51 days. The ticker on that specific page was frozen (Gold ₹1,58,197, WTI $104, every
instrument showing +0.00% change), the nav was missing routes added after May 27 (Options,
Calendar), and the footer was an old version. Every other route on the site — homepage,
`/briefs`, `/options` — was serving fresh, current data the entire time. This was not a
site-wide outage; it was one route silently pinned to a 51-day-old build while everything
around it kept working.

## Detection lag

**51 days.** Found only by an external audit (a third party manually clicking through the site
and comparing dates), not by anything internal to the system — because nothing internal was
looking. Two consecutive fetches on 17 Jul confirmed the staleness was persistent, not a
one-off cache blip.

## Root cause (5 whys)

1. **Why was `/news` stale?** A Vercel build/deployment serving that specific route got stuck —
   best-evidence conclusion from direct investigation (`curl -sI` showed `x-nextjs-prerender: 1`
   with May-27 content on a page whose source code was demonstrably correct and current): an
   ISR revalidation exception on that route caused Vercel to keep serving the last
   successfully-rendered version indefinitely rather than surfacing the failure. (The original
   audit's initial theory — a race condition between `intelligence-engine.yml` and
   `flash-brief.yml` corrupting shared state — was checked and not what direct evidence
   supported; noted here so it isn't re-investigated as if unconfirmed.)
2. **Why did later deploys not fix it?** Next.js/Vercel ISR's failure mode for a throwing
   revalidation is silent — it doesn't roll the route back to an error state or a build
   failure, it just keeps the stale render. Nothing in the deploy pipeline verified that a
   *specific route*, post-deploy, actually reflected the new build.
3. **Why was there no such verification?** No observability layer existed at all. Zero
   synthetic checks against live production URLs, zero build-ID stamping to detect
   "two builds serving simultaneously," zero post-deploy smoke test.
4. **Why did 51 days pass without anyone noticing manually?** The homepage and other primary
   surfaces were fresh, so a glance at the site looked healthy. `/news` specifically wasn't
   part of any routine manual check, and there was no automated cross-page consistency check
   that would have flagged one route disagreeing with the rest.
5. **Why was external audit the only path to discovery?** The entire pipeline ran with "zero
   human gate and zero validation" (no publish gate, no semantic check, no plausibility check
   on any published number) and zero alerting of any kind — every layer that could have
   surfaced this earlier (schema validation, build-ID cross-check, synthetic monitoring,
   incident alerting) was simply absent until this remediation effort.

## Fix

- Repo-side: `app/news/page.tsx` got defensive try/catch + structured error logging around its
  data reads, and a visible build/generation timestamp so staleness is detectable by eye
  without needing to diff HTML.
- The stuck deployment itself was cleared by a fresh production redeploy (confirmed resolved:
  later verification in this same remediation effort showed `/news`, `/`, `/briefs`, and
  `/options` all serving an identical `bb-build` meta tag and current content).
- Everything else below is the systemic fix — making this *class* of failure impossible to
  stay silent for 51 days again, not just fixing this one instance.

## Which gate/monitor now catches this

| Control | What it does | File |
|---|---|---|
| P-01 build-ID stamping | Every route renders `<meta name="bb-build">`; two different values across routes means two builds are serving simultaneously | `app/layout.tsx` |
| M-01 (synthetic monitor) | Checks `bb-build` uniformity across `/`, `/briefs`, `/options` every 15 min against live production | `scripts/synthetic-monitor.mjs` |
| M-02 | Detects a missing/frozen ticker timestamp during market hours | `scripts/synthetic-monitor.mjs` |
| M-04 | `/feed.xml` newest-item age check (>24h on a trading day) | `scripts/synthetic-monitor.mjs` |
| M-06 | Cross-page price consistency — the exact "/news disagrees with everything else" signature | `scripts/synthetic-monitor.mjs` |
| P-03 ISR policy | `/briefs` and `/feed.xml` were found *during this remediation* to have no `revalidate` declared at all (the same "silently freezes until redeploy" pattern as the original incident) — now CI-blocked for any live-data page | `config/revalidate.mjs`, `scripts/check-revalidate-policy.mjs` |
| P-04 post-deploy smoke | Runs M-01..M-06 against each new production deployment as soon as Vercel reports it live | `.github/workflows/post-deploy-smoke.yml` |
| Alerting | A new incident now opens a GitHub Issue + Telegram ping within 15 minutes instead of waiting for an external audit | `.github/workflows/synthetic-monitor.yml` |

51 days → under 15 minutes, per the master doc's own SLO (Part 11.1: incident detection lag
< 30 min, vs. the 51 days this postmortem documents).

## Change discipline note (Part 10)

This repo doesn't use a PR-per-change workflow for the automated content pipeline (see
CLAUDE.md's "direct commits to main are deliberate" section) — but every schema, prompt, and
threshold change made during this remediation was still committed individually with a rationale
in the commit message, one defect/feature per commit, verified (tests + lint + tsc + build)
before the next. That's this repo's substitute for "PR with a one-line rationale: future-you is
the reviewer" — the commit log serves the same function.
