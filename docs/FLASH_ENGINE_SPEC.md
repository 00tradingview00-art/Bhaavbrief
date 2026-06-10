# BhaavBrief Flash Engine — Event-Driven Feed

**Problem:** the current feed publishes rewritten ET headlines on a clock — so it produces
contradictory numbers (three different silver "record highs" in one day), generic filler,
fake relative timestamps, and goes silently stale for two weeks.

**Principle:** a flash exists ONLY because a trigger fired. No trigger → no post.
The monitor runs every 15 minutes, but most runs publish nothing. That's correct behavior.
A feed with 3 real signals a day beats one with 20 pieces of filler.

---

## 1. Triggers (the only reasons a flash may exist)

| # | Trigger | Default threshold | Example flash |
|---|---------|------------------|---------------|
| T1 | % move vs last-published baseline | Gold ±1.0% · Silver ±2.0% · Crude ±1.5% · Copper ±1.5% · NatGas ±2.5% · USDINR ±0.30% | "MCX Crude +1.8% in 40 min as WTI reclaims $90" |
| T2 | Round-number cross | Gold ₹5,000 steps · Silver ₹10,000 · Crude ₹500 · USDINR ₹0.50 | "MCX Gold breaks below ₹1,50,000 for first time since…" |
| T3 | Morning-brief level breach | S/R levels published in today's brief (read from brief metadata) | "Silver breaches the ₹2,36,500 support flagged in Edition #39" |
| T4 | MCX–COMEX divergence | Spread vs 5-day mean > 2σ (rupee doing something unusual) | "MCX gold premium widens to 2.1% — rupee, not bullion" |
| T5 | Data-release outcome | Fixed calendar: EIA Wed, CPI, Fed, RBI, OPEC+ — fires ONLY after release, with actual vs prior | "EIA draw of 4.1M bbl vs +1.2M expected" |

T3 is the differentiator nobody else has: the morning brief publishes levels,
the feed reports when they break. The brief and the feed become one product.

### Anti-noise rules

- **Cooldown:** one flash per instrument per 75 min. A continuing move only re-fires
  if it extends by another full threshold step from the LAST FLASH's price (ratchet),
  so a trending day produces 2–3 escalation posts, not 12 copies.
- **Baseline = last published price for that instrument**, not last poll. This is what
  prevents "silver hits record ₹1.9L" and "silver hits record ₹2.5L" coexisting —
  every flash is anchored to the previous flash's number.
- **Quiet is rendered, not hidden:** if no flash in 4h during market hours, the feed
  shows "Quiet session — no threshold moves since HH:MM" with live mini-prices.
  Honest silence > fake activity. Kills the "7h ago" lie permanently.

## 2. Kill the ET-rewrite layer

The "Gold rate today… check city-wise rates" items are scraped headline rewrites:
copyright exposure, zero differentiation, and the source of the contradictory numbers
(each rewrite inherits a different article's stale figures). Delete that ingestion path.
Every flash from now on is generated from YOUR snapshot numbers and a trigger packet —
the same single source of truth as everything else. External news returns later, if ever,
only as background context passed to the model, never as the story itself.

## 3. Architecture (same stack: Actions + snapshot + Claude + validator)

```
GitHub Action: every 15 min, 09:00–23:30 IST weekdays
  1. fetch-snapshot.mjs        → fresh data/market-snapshot.json
  2. flash-monitor.mjs         → detect triggers vs data/flash-state.json
       no trigger → exit 0, nothing committed (the common case)
       trigger    → build trigger packet
                  → Claude call: snapshot + packet + last 3 flashes for that
                    instrument ("do not contradict these") + today's brief levels
                  → strict JSON out: {title, body, tags, instrument}
  3. validate (same gate as the brief: numbers vs snapshot, direction, compliance)
  4. commit flash + updated state + snapshot atomically → Vercel redeploys
```

Generation rules baked into the prompt: every number from the snapshot verbatim;
title states instrument + magnitude + driver; 60–120 word body; one "what to watch"
level; absolute IST timestamps; no advice phrasing; no superlatives ("record",
"lifetime high") unless the trigger packet explicitly proves it against stored extremes.

## 4. State file (data/flash-state.json)

```json
{
  "MCX_CRUDE": {
    "lastFlashAt": "2026-06-10T06:05:00Z",
    "lastFlashPrice": 8421,
    "lastRoundLevel": 8500,
    "recentFlashIds": ["2026-06-10-0935-crude-..."]
  }
}
```

Committed with each flash — the ratchet, cooldown, and contradiction guard all read it.

## 5. Cost & rate fit

~58 polls/day, typical trigger rate 2–6/day → 2–6 Claude calls daily, each well under
2k tokens. Trivial cost. Actions minutes: a no-trigger run is <30s.

## 6. Cutover

1. Hide the current feed page TODAY (a missing section beats a broken one).
2. Delete the ET ingestion job and its stale flash entries (or noindex them — the
   contradictory ones are live liabilities).
3. Deploy snapshot layer → flash-monitor → re-enable the page with T1+T2 only.
4. Add T3 (brief-level breaches) once brief metadata carries levels as JSON.
5. Add T5 calendar events last.
