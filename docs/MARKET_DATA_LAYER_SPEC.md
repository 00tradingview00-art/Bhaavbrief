# BhaavBrief Market Data Layer — Single Source of Truth

**Problem this kills:** three different gold prices on one page, hardcoded USDINR 96.33,
% changes copied across instruments, "MCX Closed" during market hours, fake "0s ago" labels.

**Root cause:** components fetch (or hardcode) prices independently. The fix is one snapshot,
written once per cycle, read by everything.

---

## 1. The snapshot file

One JSON file is the only place a price ever lives: `data/market-snapshot.json`.
Committed to the repo by the pipeline (you're on static/ISR Vercel, so a commit = a deploy = fresh data everywhere at once).

```json
{
  "generatedAt": "2026-06-10T01:00:04Z",
  "generatedAtIST": "2026-06-10 06:30 IST",
  "source": "yahoo-finance",
  "instruments": {
    "MCX_GOLD":   { "symbol": "GOLD.MCX",  "price": 152443, "prevClose": 152400, "changePct": 0.03,  "unit": "INR/10g",  "currency": "INR" },
    "MCX_SILVER": { "symbol": "SILVER.MCX","price": 238528, "prevClose": 243050, "changePct": -1.86, "unit": "INR/kg",   "currency": "INR" },
    "MCX_CRUDE":  { "symbol": "CRUDEOIL.MCX","price": 8421, "prevClose": 8362,  "changePct": 0.71,  "unit": "INR/bbl",  "currency": "INR" },
    "MCX_COPPER": { "symbol": "COPPER.MCX","price": 1327.65,"prevClose": 1336.7,"changePct": -0.68, "unit": "INR/kg",   "currency": "INR" },
    "MCX_NATGAS": { "symbol": "NATURALGAS.MCX","price": 301.6,"prevClose": 305.1,"changePct": -1.15,"unit": "INR/mmBtu","currency": "INR" },
    "USDINR":     { "symbol": "INR=X",     "price": 95.35,  "prevClose": 95.29, "changePct": 0.06,  "unit": "INR",      "currency": "INR" },
    "COMEX_GOLD": { "symbol": "GC=F",      "price": 4201.5, "prevClose": 4336,  "changePct": -3.10, "unit": "USD/oz",   "currency": "USD" },
    "COMEX_SILVER":{ "symbol": "SI=F",     "price": 64.00,  "prevClose": 68.42, "changePct": -6.46, "unit": "USD/oz",   "currency": "USD" },
    "WTI":        { "symbol": "CL=F",      "price": 88.99,  "prevClose": 91.30, "changePct": -2.53, "unit": "USD/bbl",  "currency": "USD" },
    "BRENT":      { "symbol": "BZ=F",      "price": 92.10,  "prevClose": 94.40, "changePct": -2.44, "unit": "USD/bbl",  "currency": "USD" },
    "HENRY_HUB":  { "symbol": "NG=F",      "price": 3.01,   "prevClose": 3.06,  "changePct": -1.63, "unit": "USD/mmBtu","currency": "USD" }
  },
  "derived": {
    "mcxComexGoldSpreadPct": 1.42,
    "importParityGoldINR": 150310,
    "goldSilverRatio": 65.6
  }
}
```

### Non-negotiable rules

1. **`changePct` is computed once, at write time**, from each instrument's OWN price and
   prevClose. No component ever computes or copies a % change. This single rule kills the
   "WTI inherits MCX Crude's +2.77%" bug class.
2. **USDINR is an instrument like any other.** It comes from `INR=X` in the same fetch.
   Delete the hardcoded 96.33. Any code path that needs the rupee imports it from the
   snapshot. The MCX–COMEX spread lives in `derived`, computed at write time from the
   same numbers — so it can never disagree with the prices shown next to it.
3. **If a fetch fails, keep the last good value and mark it.** Add `"stale": true` to that
   instrument. Never write 0, never write null into price, never fall back to a hardcoded
   constant. Brent showing "—" forever means there's no last-good-value handling.
4. **One writer, many readers.** Only the pipeline script may write this file. Every UI
   component, the brief generator, and the email template read from it. If you find a
   `fetch(` to Yahoo anywhere outside `scripts/fetch-snapshot.mjs`, that's a bug.

---

## 2. Readers (the UI contract)

```
TickerBar      → snapshot.instruments[*].price, changePct
PulseWidget    → same object, same keys
MarketsPage    → same object, same keys
BriefGenerator → receives the snapshot JSON verbatim in its prompt
EmailTemplate  → renders numbers from the same snapshot the brief was generated from
```

Because everyone reads one object, "ticker says ₹1,58,197, pulse says ₹1,49,850,
brief says ₹1,52,443" becomes structurally impossible — not "fixed", impossible.

### Freshness display (replace the lying timestamps)

- Always render `as of {generatedAtIST}` — a real timestamp, never "0s ago" / "7h ago"
  computed client-side from nothing.
- If `now - generatedAt > 2h` during MCX hours → show an amber "data delayed" badge.
- If `> 12h` → grey the ticker out entirely. A visibly stale ticker keeps trust;
  a confidently wrong one destroys it.

### Market-hours logic — one function, used everywhere

```ts
// lib/mcxHours.ts — the ONLY place this logic exists
export function isMcxOpen(now = new Date()): boolean {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();                      // 0 Sun, 6 Sat
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 9 * 60 && mins <= 23 * 60 + 30; // 09:00–23:30 IST
}
```

---

## 3. Pipeline order (GitHub Actions, 6:30 AM IST cron)

```
1. fetch-snapshot.mjs   → writes data/market-snapshot.json  (fail job if >3 instruments stale)
2. generate-brief.mjs   → Claude call; prompt includes the snapshot verbatim;
                          instruction: "use ONLY these numbers, never recall prices from memory"
3. validate-brief.mjs   → deterministic checks + one Claude semantic pass (see script)
                          exit 1 on FAIL → brief is NOT committed, job fails loudly
4. commit + push        → snapshot + brief land in main together, atomically.
                          The brief and the site can never show different vintages.
5. Brevo send           → only after the commit succeeds
```

Step 4 is the subtle one: **commit the snapshot and the brief in the same commit.**
That's what makes the email, the homepage, and the brief page agree by construction.

### Slug bug (the "27-ay2026" URLs)

Your slug generator is eating the "M" — almost certainly a regex stripping the month's
first letter or a locale-dependent `toLocaleDateString`. Replace with deterministic ISO:

```js
const slug = `${date.toISOString().slice(0, 10)}-${title.toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
// → 2026-06-10-silver-slammed-gold-slides
```

Indexed URLs are permanent — every day this runs, it mints another broken asset.
Fix before the next publish, and 301 the existing bad slugs.

---

## 4. Migration order (half a day total)

1. Write `fetch-snapshot.mjs`, generate first snapshot, commit. (~1h)
2. Point TickerBar at the snapshot, delete its fetch + the hardcoded 96.33. (~30m)
3. Point Pulse + Markets page at it; delete the %-copying code. (~1h)
4. Feed snapshot verbatim into the brief prompt. (~30m)
5. Wire validate-brief.mjs as the gate (script provided). (~30m)
6. Fix slug generator + 301s. (~30m)
7. Replace "0s ago"/"7h ago" with `as of {generatedAtIST}` + staleness badges. (~30m)
