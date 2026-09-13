# BhaavBrief SEO and LLM growth plan — preserve the current index

## Objective

Grow non-brand organic discovery and LLM retrieval without reducing the visibility, crawlability, canonical identity, or on-page relevance of any URL already indexed by Google.

The plan is deliberately additive. Existing indexed URLs are treated as a protected cohort until a URL-level, reversible experiment is explicitly approved from Search Console evidence.

## Non-negotiable guardrails

For any URL that is indexed at the baseline:

- Do not change its URL, slug, redirect behavior, `robots` directive, canonical, sitemap membership, title, H1, primary answer, or publication date.
- Do not bulk-edit old briefs, Flash stories, articles, research, or Learn pages.
- Do not remove an existing URL from either sitemap and do not send a removal request to Google.
- Do not apply `noindex` retrospectively to Flash or article archives.
- Do not replace, merge, or consolidate existing pages based on keyword overlap alone.

An exception needs a written URL-level hypothesis, a pre-change Search Console baseline, a staged preview check, and a rollback prepared before deploy.

The freeze has no automatic staleness-refresh exception. The dashboard may flag a protected URL as stale, but editing it requires the same explicit URL-level approval path.

## Phase 0 — establish the protected cohort (days 1–3)

**Owner:** founder/editorial owner

1. Export the last 90 days from Google Search Console by page and query.
2. Save a baseline inventory containing each indexed URL, Google-selected canonical, submitted canonical, index status, impressions, clicks, CTR, average position, and top queries.
3. Label each URL as one of: `learn`, `tool`, `options`, `commodity`, `brief`, `flash`, `article`, `research`, or `commercial`.
4. For Flash and other time-sensitive items, record content-age buckets: `0–2`, `3–7`, `8–30`, `31–90`, and `90+` days. Compare like ages only.
5. Record the current sitemap URL count, indexed URL count per label, Google News impressions/clicks, and Google Search Console Crawl Stats. Add server crawl logs if available.
6. Create a weekly dashboard with the baseline as the comparison period. Do not interpret a one-week movement as a content effect; review 28-day trailing values and age-bucket comparisons.

**Exit criteria:** a named, dated export exists; every indexed page has a protected-cohort and age label; and crawl, News, and search baselines are saved.

## Phase 1 — install rules for all future content (days 4–7)

**Scope:** new URLs and new generated content only.

### New evergreen page template

Every new Learn, tool-support, commodity, or event explainer page must have:

1. One primary search intent and one canonical URL declared before drafting.
2. A direct answer in the first 120 words.
3. A named author/reviewer, source list, `lastReviewed` date, and data timestamp where values change.
4. One worked India-specific MCX example drawn from validated data.
5. Three to five FAQs that answer real supporting queries.
6. Breadcrumb and appropriate JSON-LD schema.
7. Three contextual internal links: hub, sibling explainer, and relevant live tool or commodity page.
8. A source-tagged newsletter or Pro conversion event.
9. A competing-URL review against the full existing corpus. The page proceeds only when it answers a query that no protected URL materially owns, or the owner approves a clearly differentiated intent.

### New Flash policy

A new Flash item starts as a draft. It becomes indexable only if it passes all of the following:

- It identifies a primary source or official announcement.
- It adds a material, distinct MCX implication beyond a percentage move.
- Its title and opening 200 words have low semantic similarity to the previous 30 days of Flash coverage for that commodity.
- Every changing number comes from the validated snapshot or named source and has a timestamp.
- It contains no trade instruction, price target, or unconditional prediction.
- It has passed a reverse-cannibalization check against the full existing corpus, not only recent Flash coverage.

Items that fail any condition remain in-product signals or unpublished drafts. This policy never changes the status of historical Flash URLs.

### LLM publishing contract

The model may write explanation, structure, and plain-language summaries. It may not originate numbers, historical statistics, source citations, calculations, or investment direction.

Each generated item needs:

- a source packet containing source URL, publication time, extraction time, and applicable commodity;
- a deterministic fact check against the snapshot and claims ledger;
- a freshness check for time-sensitive facts;
- a title/body duplicate check against recent items;
- a compliance and prediction check;
- a publish decision stored with prompt version, model, source-packet hash, and check results.

Research remains a human-reviewed lane before publication because it is financially sensitive and commercially important.

Event-to-price explainers, including the proposed EIA and FOMC pages, receive an elevated language gate. They may describe release mechanics, historical data from approved sources, and conditional context; they may not imply a future price direction, action, or forecast.

## Phase 2 — build keyword ownership through new pages (weeks 2–8)

Create a keyword map before publishing. A query may have one primary destination. Existing indexed URLs keep their current target queries; new URLs fill gaps rather than competing with them.

Before a page enters production, run a current SERP and competitive-difficulty check for its primary and supporting queries. Record leading result types, publisher authority, existing BhaavBrief URLs, differentiated evidence, and a realistic ranking thesis. Defer a page where BhaavBrief has no distinct India-specific answer or data advantage.

| Publishing order | New page | Primary intent | Supporting intent | Conversion path |
| --- | --- | --- | --- | --- |
| 1 | MCX Silver contracts | MCX silver lot size | Silver Mini/Micro margin, tick value | Lot-size hub → options |
| 2 | MCX Crude Oil contracts | MCX crude mini lot size | Crude margin, tick value, contract value | Crude options → daily brief |
| 3 | MCX Natural Gas contracts | MCX natural gas lot size | Nat Gas Mini margin, tick value | Nat Gas options → daily brief |
| 4 | MCX open interest explained | MCX open interest meaning | OI buildup, long/short buildup | Open-interest tool → Pro |
| 5 | MCX import parity explained | MCX gold premium over COMEX | USD/INR, duties, parity calculation | Basis dashboard → newsletter |
| 6 | Contango and backwardation in MCX | MCX contango meaning | rollover cost, futures versus spot | Rollover guide → basis |
| 7 | EIA crude inventory and MCX | EIA inventory effect on MCX crude | EIA timing India, crude volatility | Event calendar → Crude options |
| 8 | FOMC and MCX gold | FOMC impact on MCX gold | Fed decision India, real yields | Event calendar → research |

For each page, define the primary query, supporting queries, user question, unique evidence, internal-link targets, CTA, and success metric before writing. Do not target NCDEX, mandi, agri, monsoon, predictions, or other areas without a matching data product and editorial coverage.

## Phase 3 — make existing strengths discoverable without editing protected pages (weeks 3–10)

1. Add new supporting pages to `/learn`, `/tools`, and relevant commodity hubs through additive navigation modules.
2. Add only new sitemap entries for new evergreen URLs; keep the current sitemap composition unchanged for protected content.
3. Expand `llms.txt` from the same source-of-truth data used by pages. It must avoid unsupported superlatives, stale margin ranges, and reader-directed trading advice. Validate it weekly against the same data source.
4. Publish a source and editorial-policy page for newly published generated content. Link it from newly created pages and from site-wide navigation only after preview validation. Add author/reviewer bios to new content, using only credentials and experience that can be documented.
5. Build a public source ledger for event explainers: source, release time, mechanism, affected MCX contracts, and article links.
6. Monitor Google News visibility separately from general search. Keep the existing 48-hour News-sitemap behavior and all existing Flash URLs unchanged; assess new Flash gating through News impressions, clicks, and inclusion before altering volume.

## Phase 4 — measured, one-page improvements to existing URLs (week 10 onward)

No protected page enters this phase unless Search Console has shown stable or falling performance for two consecutive 28-day periods and the page has a documented user-value problem.

For one URL at a time:

1. Write the hypothesis, e.g. “adding a self-canonical resolves a canonical mismatch without changing rendered copy.”
2. Capture 28-day pre-change impressions, clicks, CTR, position, selected canonical, title, H1, word count, and internal-link count.
3. Make one reversible change in a preview deployment.
4. Confirm the rendered HTML, canonical, structured data, robots header, sitemap entry, and visual page output.
5. Deploy and compare to the pre-change baseline after 14 and 28 days, including Crawl Stats and the relevant page-type cluster.
6. A URL must have at least 100 clicks or 1,000 impressions in its baseline 28-day window to qualify for a percentage-based experiment. For lower-volume URLs, use an index/crawl/cluster review instead.
7. Roll back if a qualifying URL’s clicks decline by more than 15% while impressions are stable, if its page-type cluster has an unexplained decline after a related release, or if Google changes its selected canonical unexpectedly.

This is the only route for adding self-canonicals to currently indexed tools and dashboards. The plan does not assume that a technically desirable canonical change is risk-free.

## Metrics and review cadence

| Metric | Baseline | Target by day 90 | Review |
| --- | --- | --- | --- |
| Indexed protected URLs | Phase 0 count | No net decline | Weekly |
| Protected cohort impressions and clicks | Phase 0, 28-day trailing by page type and age bucket | No unexplained decline greater than 10% | Weekly |
| Crawl activity | Phase 0 Crawl Stats / logs | No unexplained decline in successful crawls | Weekly |
| Google News performance | Phase 0, 28-day trailing | No unexplained decline after new Flash gating | Weekly |
| New evergreen URLs indexed | 0 | 6–8 | Weekly after publishing |
| New evergreen impressions | 0 | Positive growth across 4 consecutive weeks | Weekly |
| Learn/tool newsletter conversion | Current GA4 baseline | Improve by page cluster | Monthly |
| Flash rejected before indexation | 0 | Tracked quality signal | Weekly |
| Corrections after publication | Current baseline | Declining trend | Monthly |

## Definition of success

After 90 days, the protected cohort has no net index loss and no unexplained visibility loss in impressions or clicks; six to eight new evergreen MCX pages are indexed and gaining impressions without taking traffic from protected URLs; new generated content has an auditable source and quality trail; and Search Console identifies at least two clusters worth expanding further.
