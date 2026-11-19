#!/usr/bin/env bash
# Vercel "Ignored Build Step" (Project Settings → Build and Deployment →
# Ignored Build Step → "Run my Bash script" → `bash scripts/vercel-ignored-build-step.sh`).
#
# Exit 0 = skip this build. Exit 1 (or anything non-zero) = build normally.
# Every decision point below defaults to building whenever a signal is
# missing or ambiguous — an unnecessary build only costs money, but wrongly
# skipping one could leave stale/incorrect content live indefinitely.
#
# Why this exists: Ignored Build Step is set to "Automatic" (Vercel's
# default: build every commit), and several cron workflows commit to main
# frequently — intelligence-engine.yml alone every 30 min, 9AM-11:30PM IST
# Mon-Fri. Build CPU Minutes has been in 100% overage on the Vercel usage
# dashboard since late October 2026; frequency was already halved once
# (2026-11-10, 0a2aea95) and the overage continued, so this targets the
# actual cause instead of cutting freshness further.
#
# Replayed this script's exact SAFE_PATHS_REGEX decision against every real
# commit to main from the 7 days up to 2026-11-15 (132 commits): 29 would
# have been skipped (~22%), 103 would still have built. That number came
# down from an initial, wrong estimate of ~44 — data/history/*.json looked
# safe by filename alone but turned out to be read directly by app/page.tsx
# and app/markets/page.tsx (homepage and markets charts), so most
# "chore: snapshot" commits that also touch it correctly still build. The
# lesson: this list is intentionally short and each entry below is backed by
# an actual grep of app/, lib/, components/, not a guess from the filename.
#
# If you change what reads any file in SAFE_PATHS — e.g. making a page read
# data/mcx-last-prices.json directly instead of treating it as a fallback
# behind a live fetch — remove it from this list, or a real content update
# could silently fail to go live until some unrelated commit forces a build.

set -u

# Preview/non-production builds (PR review, manual redeploys, etc.) are rare
# and cheap relative to the cron volume this script targets — never skip
# those, so this optimization can't interfere with reviewing interactive
# changes. VERCEL_ENV has been reported empty in some Ignored-Build-Step
# contexts; if so, this check simply can't fire and we fall through to the
# diff check below, which is the real decision mechanism.
if [ -n "${VERCEL_ENV:-}" ] && [ "${VERCEL_ENV}" != "production" ]; then
  echo "VERCEL_ENV=${VERCEL_ENV} (not production) — building."
  exit 1
fi

PREV_SHA="${VERCEL_GIT_PREVIOUS_SHA:-}"

if [ -z "$PREV_SHA" ]; then
  echo "No VERCEL_GIT_PREVIOUS_SHA (first deploy, or no prior successful build on this branch) — building."
  exit 1
fi

# Vercel's build checkout can be shallow, so the previous deployment's commit
# may not be present locally yet. Try to fetch just that commit; if the repo
# is already shallow this still works without a full unshallow fetch.
if ! git cat-file -e "${PREV_SHA}^{commit}" 2>/dev/null; then
  git fetch --depth=100 origin "$PREV_SHA" >/dev/null 2>&1 || git fetch --unshallow >/dev/null 2>&1 || true
fi

if ! git cat-file -e "${PREV_SHA}^{commit}" 2>/dev/null; then
  echo "Could not resolve previous commit ${PREV_SHA} locally — building to be safe."
  exit 1
fi

CHANGED="$(git diff --name-only "$PREV_SHA" HEAD)"

# A real new commit always changes at least one file, so an empty diff here
# means this deployment is for the *same* commit as the last one — i.e. a
# deploy hook or manual redeploy, not a cron commit. The cron pipeline's
# volume (the thing this whole script exists to cut build minutes on) is
# handled entirely by the SAFE_PATHS_REGEX check below, which only runs when
# CHANGED is non-empty — so skipping here saves nothing from that budget.
# What it did break: the Kite-auth callback (app/api/kite/callback/route.ts)
# fires a deploy hook on the same commit purely to pick up a new
# KITE_ACCESS_TOKEN env var, with no file change at all — this branch was
# silently canceling that redeploy every time, so the new token never
# actually went live (fixed 2026-11-19, found via 4 failed morning logins).
if [ -z "$CHANGED" ]; then
  echo "No file changes since the last build (same-commit redeploy, e.g. a deploy hook or env-var update) — building."
  exit 1
fi

# Each path here is a pure runtime-fallback cache or internal bookkeeping
# file — confirmed by grepping app/, components/, and lib/ for each
# filename; none of them import it. (data/history/*.json, data/site's
# market-structure.json, data/kite-instruments.json, data/engine-state.json,
# and anything under content/ were all checked too and deliberately left OUT
# — each is read by a live page/route, directly or via a Redis-primary path
# whose file fallback still matters for an external monitor.)
#   data/market-snapshot.json   — lib/snapshot.ts reads this; the brief
#                                  generator/gate/email paths run in GitHub
#                                  Actions, not in the deployed app.
#   data/mcx-last-prices.json   — lib/prices.ts's fetchMCXLastKnown() fallback,
#                                  read only when the live Kite/Yahoo fetch
#                                  fails; never the primary ticker/price path.
#   data/gate-log.jsonl         — scripts/lib/claimsCheck.mjs's audit trail;
#                                  not imported anywhere under app/ or lib/.
#   data/last-article-title.txt — read only by the next workflow run to build
#                                  its own commit message; not app-facing.
#   data/guardian-report.json   — scripts/site-guardian.mjs's own audit
#                                  trail; not imported anywhere under app/ or
#                                  lib/ (data/market-structure.json, the file
#                                  app/options/strategy/page.tsx actually
#                                  reads, is deliberately NOT in this list).
#   data/site-stats.json        — not imported anywhere under app/lib/components.
#   data/flash-state.json       — not imported anywhere under app/lib/components.
#   data/follower-history.json — not imported anywhere under app/lib/components.
#   data/keyword-coverage.json — not imported anywhere under app/lib/components.
#   scripts/seen-macro.json       — only read by scripts/site-guardian.mjs itself.
#   scripts/seen-geopolitical.json — only read by scripts/site-guardian.mjs itself.
SAFE_PATHS_REGEX='^(data/(market-snapshot\.json|mcx-last-prices\.json|gate-log\.jsonl|last-article-title\.txt|guardian-report\.json|site-stats\.json|flash-state\.json|follower-history\.json|keyword-coverage\.json)|scripts/seen-(macro|geopolitical)\.json)$'

UNSAFE="$(echo "$CHANGED" | grep -Ev "$SAFE_PATHS_REGEX" || true)"

if [ -n "$UNSAFE" ]; then
  echo "Changes outside the known-safe list — building. Changed files:"
  echo "$CHANGED"
  exit 1
fi

echo "Only known-safe cache/bookkeeping files changed — skipping build. Changed files:"
echo "$CHANGED"
exit 0
