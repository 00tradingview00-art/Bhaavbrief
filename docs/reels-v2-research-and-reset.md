# BhaavBrief Reels — Research, Audit and Content Reset

## Decision

Pause the current V2 publishing cadence. Keep the premium visual direction, but
retire the “one image + several slogans” treatment. The account needs **market
literacy with proof**, not market-themed wallpaper.

The audience assumption is an Indian, mobile-first viewer who is curious about
commodities but does not yet understand MCX pricing, contracts or the difference
between a global headline and an Indian market price. The content must make that
person feel more capable after one viewing; it must not treat them as an active
day trader looking for a call.

## What failed in the launch Reel

| Finding | Evidence | Required change |
| --- | --- | --- |
| Text visibly blinked | The renderer passed `time % 1` to the fade function, resetting opacity every second. | Fixed in the renderer: copy now fades in once per scene and holds. No Reel can be released without an exported motion review. |
| There was a formula but no explanation | “MCX price = gold × dollar × rupee” did not identify the viewer’s actual confusion, define the comparison, or show what changes locally. | Every Reel must contain a tension, a mechanism, and a practical check. |
| The same image carried every idea | A pan over one visual cannot distinguish global price, FX conversion, and local consequence. | Each causal step needs a distinct visual action, source card, object, or side-by-side comparison. |
| The content was too ambitious for the account’s retention | The internal history contains 68 tracked Reels: 41.8 mean views, 34 median views, and 3.2 seconds mean watch time. Recorded saves and shares are zero. | A Reel earns only one idea; proof and detail move to a carousel or Stories. |
| A finished image was mistaken for a finished story | The creative system privileged physical metaphor before a viewer question and source. | The editorial brief is approved before any image prompt or render. |

## Research implications

Commodity derivatives require unusually clear education. SEBI describes derivatives
as instruments whose value comes from an underlying product and warns that a small
amount paid relative to the underlying can multiply gains and losses.^1 This makes
“margin is not risk,” delivery/expiry, contract size, basis, and the India-vs-world
price gap legitimate high-value learning topics—not generic beginner content.

MCX itself frames investor awareness around commodity-derivatives dos and don’ts,
which validates a trust-first editorial stance rather than tip-led posting.^2 For
gold, World Gold Council research identifies interconnected drivers including
currencies, rates, risk, momentum and demand; it also publishes Indian local
premium/discount data.^3 The resulting content opportunity is not “gold up/down”;
it is **which driver changed, how it reached India, and what a viewer may be
confusing it with**.

For crude, the EIA’s weekly report is a reliable source for inventories, production,
imports and refinery inputs, while its regular release timetable makes it a usable
recurring event trigger.^4 USD/INR needs an equally disciplined source: RBI states
that the reference rate moved to FBIL’s daily weekday publication process.^5

Platform mechanics still matter, but they are secondary to the story. Meta’s
guidance supports vertical 9:16 video, audio, and key messages inside the safe zone;
it reports better ad outcomes for that combination.^6 BhaavBrief already has those
basics. The missing variable is message design.

## The new editorial unit: one question, one answer, one proof

Every proposed post must answer all six fields before production:

| Field | Standard | Example: Indian gold price |
| --- | --- | --- |
| Viewer question | A sentence a real person would ask after seeing a price or headline. | “Gold is flat abroad. Why did my India quote rise?” |
| Misconception | The mental shortcut being corrected. | “Global gold and MCX gold are the same chart.” |
| Single answer | One causal claim, stated plainly. | “USD/INR can amplify or offset the global move in rupees.” |
| Proof | One dated, source-labelled visual. | Same-timestamp global gold, USD/INR and MCX snapshot. |
| Boundary | What the content does *not* establish. | “It does not predict the next move or a jewellery quote.” |
| Actionable literacy | A check, not a trade action. | “Before reading MCX gold, check global gold and USD/INR.” |

If any field is absent, the idea is a Story prompt or is discarded.

## Format system

### 1. Market Tension Reel — 10–14 seconds, 3 shots

Use when there is a live, verified discrepancy or event.

1. **0–2s: the tension.** “Crude fell. Why might petrol not?”
2. **2–8s: the answer.** One causal chain, visually separated into two or three
   steps.
3. **8–12s: the check.** “Watch crude, USD/INR and the domestic pricing lag.”

One number maximum. A source/timestamp card stays visible long enough to read.
No “BhaavBrief” product frame until the answer has landed.

### 2. India Lens Carousel — five slides

Use for explanations that require evidence or caveats. This is the save-first
format, not a Reel stretched beyond its natural length.

1. The confusion.
2. The three moving parts.
3. A dated example / source.
4. The common mistake.
5. The repeatable check.

### 3. Desk Note — 15–18 seconds, only when a scheduled data release lands

Use EIA petroleum data, an RBI/FBIL currency move, MCX circular, OPEC+ decision,
or a clearly relevant macro event. Show **what happened → why the contract cared →
what data settles the question next**. Avoid post-hoc certainty.

### 4. “The Mistake Is…” — 12–15 seconds

Use a concrete error that cost a person attention, money, or time: confusing
margin with position risk; treating an expiry as an ordinary day; comparing a
jewellery quote with an MCX futures quote. These are not generic lessons because
they begin with a specific false assumption.

## Visual and motion rules

- One visual object per causal step. Do not reuse a beautiful still as every shot.
- Text is a sentence fragment, never a paragraph. Voiceover supplies nuance;
  on-screen text supplies the memory anchor.
- Fade copy in once over 200–300ms and hold it for at least 1.5 seconds. No looping
  alpha, pulsing, typewriter effect, or moving price line behind key copy.
- Use a source chip: `MCX • 11 Sep, 3:30pm IST`, `FBIL USD/INR • 1:30pm IST`, or
  `EIA WPSR • 10 Sep`. It is evidence, not decoration.
- Keep the female voice only. Music supports the pace but is silent beneath the
  first spoken sentence and remains materially lower than narration.
- Do not use fake terminals, human avatars, stock-market b-roll, or generic candlesticks.

## Source hierarchy and release gate

| Need | Primary source | Allowed use |
| --- | --- | --- |
| MCX contract, expiry, lot, circular, exchange data | MCX | Contract-specific learning and exchange facts |
| USD/INR reference | FBIL / RBI | Daily India-currency context |
| Gold drivers and global gold data | World Gold Council / named benchmark source | Gold mechanism, demand and macro context |
| Crude supply event | EIA WPSR; official OPEC material where applicable | Inventory and supply context |
| India retail fuel context | Official OMC / government source | Domestic-price explanation |

Release only when all of the following are true:

1. The source is shown, dated and internally saved.
2. The content explains a mechanism, not a correlation alone.
3. A non-trader can repeat the final check in one sentence.
4. The Reel passes a full-motion visual review with audio.
5. The caption adds source context or caveat; it does not repeat the Reel word for word.

## Seven-post pilot after the reset

The dates are deliberately not locked to forecasts. Each post is selected only when
the stated trigger exists; otherwise the fallback is used.

| Slot | Trigger | Post | Fallback |
| --- | --- | --- | --- |
| 1 | USD/INR and global gold diverge from MCX gold | **Why the India gold chart disagreed today** — tension Reel + source card | Carousel: “Three prices people call ‘gold’” |
| 2 | Weekend | **Monday’s commodity map** — three dated variables, no forecast | Story poll: “Which move should we decode Monday?” |
| 3 | Crude moves > meaningful threshold with a clear driver | **Crude moved. What reaches India, and what does not?** | Carousel: “Crude price is not petrol price” |
| 4 | No major market event | **Margin is the entry ticket, not the risk limit** | “What changes near expiry?” |
| 5 | EIA Wednesday release | **What the inventory number actually changes** | “Why one inventory number cannot explain crude alone” |
| 6 | MCX contract / circular / expiry-specific event | **The contract detail people notice too late** | “MCX vs jewellery gold: different products” |
| 7 | Weekly review | **This week’s one force that travelled through three markets** | Community answer to the highest-reply Story question |

The product appears only as the observation layer: “BhaavBrief separates the
global move, the INR move and the India contract.” It is never the hook, payoff or
call to action.

## Measurement plan

The current data is too thin to optimize for a single vanity target. Record, at 24
hours and 7 days, reach, 3-second view rate, average watch time, completion, saves,
shares, profile visits and replies. Compare only same-length formats.

| Decision | Signal | Response |
| --- | --- | --- |
| Hook fails | Weak 3-second rate relative to the pilot median | Rewrite the question, not the visual polish. |
| Mechanism fails | Good initial hold but low completion | Remove a step or move proof to carousel. |
| Content has utility | Saves or shares per reach rise | Build a repeatable series from the same misconception family. |
| Product feels salesy | Strong drop at product mention or negative replies | Move product reference into the caption / final frame only. |

## First production brief after approval

**Title:** Why three “gold prices” can all be right.  
**Format:** Five-slide India Lens carousel, then a 12-second companion Reel.  
**Question:** “The global chart, MCX and my jeweller all show different gold prices. Which one is wrong?”  
**Answer:** They are different reference points: global spot/futures, an Indian
futures contract, and a retail quote with local components.  
**Proof requirement:** Same-date source labels and an MCX contract reference.

This is a better first lesson than the current Reel because it gives the viewer a
complete map before asking them to reason about currency conversion.

## Sources

1. Securities and Exchange Board of India, “[Understanding Derivatives](https://investor.sebi.gov.in/understanding_derivatives.html).” Accessed 11 September 2026.
2. Multi Commodity Exchange of India, “[Investor Awareness](https://www.mcxindia.com/Investor-Services/investor-awareness).” Accessed 11 September 2026.
3. World Gold Council, “[Gold Price Performance & Data](https://www.gold.org/goldhub/data)” and “[What drives gold?](https://www.gold.org/goldhub/research/what-drives-gold).” Accessed 11 September 2026.
4. U.S. Energy Information Administration, “[Petroleum & Other Liquids Data](https://www.eia.gov/petroleum/data.php)” and “[Weekly Petroleum Status Report](https://www.eia.gov/petroleum/supply/weekly/pdf/wpsrall.pdf).” Accessed 11 September 2026.
5. Reserve Bank of India, “[Computation and Dissemination of Reference Rate](https://www.rbi.org.in/commonman/Upload/English/PressRelease/PDFs/PR3504072018.PDF).” 4 July 2018.
6. Meta for Business, “[Instagram & Facebook Reels](https://www.facebook.com/business/ads/facebook-instagram-reels-ads).” Accessed 11 September 2026.
