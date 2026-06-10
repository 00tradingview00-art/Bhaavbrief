# BhaavBrief Learn — SEO Architecture

**Why this is the growth channel:** Search Console already shows "mcx lot size"
surfacing your one Learn page at ~position 13 with zero dedicated effort. Daily briefs
can't rank (dated, ephemeral, low search volume per edition). Evergreen MCX reference
pages can — the query space is real, intent is high, and competition is weak
(Zerodha Varsity covers equities deeply but MCX thinly; the rest is broker spam).

**Current state:** one page at /learn, "Article 1 of 3", sidebar topics rendered as
dead text. One URL can't rank for thirty queries. Every topic becomes its own page.

---

## 1. URL structure

```
/learn                          → hub page (links every article, thin text, navigational)
/learn/mcx-lot-sizes            → THE money page (see priority below)
/learn/mcx-gold-contracts       → Standard / Mini / Guinea / Petal
/learn/mcx-silver-contracts     → Standard / Mini / Micro
/learn/mcx-crude-oil-contract   → Crude + Crude Mini
/learn/mcx-natural-gas-contract
/learn/mcx-base-metals          → Copper, Zinc, Aluminium, Lead, Nickel
/learn/mcx-margin-calculation   → SPAN + exposure, with worked example
/learn/mcx-expiry-rollover      → expiry calendar logic, how to roll
/learn/contango-backwardation   → with a live MCX example pulled from snapshot
/learn/mcx-trading-taxation     → 43(5) business income, CTT, audit thresholds
/learn/gold-etf-vs-mcx-gold     → cross-links to /invest (already half-built there)
/learn/how-jewellers-hedge-gold
/learn/usdinr-impact-mcx        → your actual editorial edge; nobody explains this well
/learn/what-is-open-interest
/learn/import-parity-price
```

Slugs: lowercase, hyphenated, no dates, never change after publish. ISO-safe like the
brief slugs — and the slug generator bug must be fixed before any of these go live.

## 2. Build order (by demonstrated + likely demand, not by logical sequence)

| Priority | Page | Why first |
|---|---|---|
| 1 | mcx-lot-sizes | Already getting impressions at position ~13. One dedicated page with the full table + each contract's margin = realistic page-1 target. This is the wedge. |
| 2 | mcx-margin-calculation | Highest commercial intent ("how much money do I need") — converts readers to subscribers best |
| 3 | mcx-gold-contracts | Gold = biggest MCX retail segment; "gold mini lot size" / "gold guinea" queries |
| 4 | mcx-trading-taxation | High volume every Jan–Mar + July; almost no good content exists |
| 5 | usdinr-impact-mcx | Low volume, zero competition, and it's your brand thesis — the rupee-buffer story your briefs tell daily |
| 6+ | everything else | One page per week is enough; consistency beats bursts |

## 3. On-page template (every article)

1. **H1 = the query**, near-verbatim: "MCX Lot Sizes 2026: Every Contract, Margin & Value".
2. **Answer in the first 120 words.** The table or number the searcher wants, immediately.
   Google's featured snippets pull from here; so does AI search. No throat-clearing intro.
3. **The live-data edge nobody else has:** inject current contract values and margins
   from `market-snapshot.json` at build time — "at today's gold price of ₹X, one Gold
   Mini lot is worth ~₹Y" with the snapshot date stamped. Every competitor page shows
   2023 numbers. Yours self-updates with each deploy. This is your only durable moat
   in this content space; use it on every page.
4. **One worked example** with real numbers (margin calc for 1 lot Crude Mini, tax calc
   on ₹2L profit). Concrete beats comprehensive.
5. **FAQ block** (3–5 real long-tail questions) with FAQPage JSON-LD schema.
6. **Cross-links:** every article links the hub, 2–3 sibling articles in-prose, and the
   relevant daily-brief tag page. Briefs link back: "Crude opens at ₹8,421 — what one
   lot costs → /learn/mcx-crude-oil-contract".
7. **Subscribe CTA at the end** with `source: "learn_<slug>"` so the GA4 event tells you
   which articles actually convert (see lib/analytics.ts).
8. Author byline + "reviewed/updated <date>" — E-E-A-T signal, and honest because the
   snapshot injection genuinely updates it.

## 4. Technical checklist

- Each page statically generated, in sitemap.xml, submitted in Search Console.
- BreadcrumbList + FAQPage structured data.
- Fix the duplicated "| BhaavBrief | BhaavBrief" title bug before launch — it leaks
  into these pages' SERP titles.
- Hub page /learn keeps its current SEO equity; the sidebar topics become real <a> links.
- Internal search (⌘K) should index Learn pages — it currently only has briefs.

## 5. Honest expectations

A new domain with 7 lifetime clicks doesn't rank in weeks. Realistic curve: pages
indexed in days, impressions building over 4–8 weeks, meaningful clicks (50–100/mo)
around month 3–4 IF the pages are genuinely the best answer. The live-data injection
is what makes "best answer" true rather than aspirational. Don't judge this channel
before September; don't skip a week of publishing before then either.
