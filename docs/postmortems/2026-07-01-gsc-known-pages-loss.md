# 2026-07-01 — GSC known-page set vanished ("Validation passed" ≠ indexed)

**Scope:** Google Search Console visibility only — no user-facing outage, no bad content
served. Logged so the October version of us doesn't re-investigate this from scratch.

## What happened

Around 1 July 2026, Search Console's known-page set for bhaavbrief.in — roughly 150 URLs —
disappeared. The cause was the site redesign's deploys changing the sitemap and route
structure: the URLs Google had previously discovered stopped being the URLs the site
declared, so Google dropped them from its known set. GSC then reported **"Validation
passed"**, which read like good news but meant only that the affected pages had *left
Google's known set* — the validation "resolved" because the pages were gone, not because
anything got indexed.

## Why it was confusing

"Validation passed" is GSC's wording for "this issue no longer applies to any known
pages." When the pages themselves vanish from the known set, every issue attached to them
"passes." Treat any sudden GSC issue-count improvement that coincides with a deploy as a
prompt to check the known/indexed page counts, not as a win.

## Resolution (21 July 2026)

- The 3-month baseline at investigation time: 19 clicks, 627 impressions, only 17 pages
  indexed — with a 140-page "Discovered – not indexed" backlog from June, 77% of it
  never-indexable news-feed items.
- sitemap.xml trimmed 467 → 107 URLs (dropped 284 `/flash` + 76 `/articles` feed items),
  resubmitted in GSC and read the same day.
- `/flash` and `/articles` pages set to `noindex, follow` (`480fc38`) — sitemap exclusion
  alone doesn't stop already-discovered URLs from being crawled and indexed; `follow`
  keeps internal link equity flowing to briefs/commodities.
- Guard added: synthetic-monitor check **M-07** (`scripts/lib/sitemapCheck.mjs`) fails if
  the live sitemap ever contains `/flash`/`/articles` URLs again or its count drifts >±2
  from the intended composition — the "deploy silently re-bloats the sitemap" class.

## Follow-up

GSC re-check scheduled 4–8 Aug 2026. Success = indexed climbing 17 → 70–100 with
"Discovered – not indexed" near zero. If indexed is still <30 by mid-August, the binding
constraint is domain authority, not technical SEO — stop SEO plumbing, shift to
distribution.

*The canonical engineering master doc lives outside this repo; this event should also be
logged there.*
