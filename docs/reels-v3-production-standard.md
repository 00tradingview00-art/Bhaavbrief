# BhaavBrief Reels — V3 production standard

Owner: Codex, at Prabal's direction. Effective 22 September 2026.

V3 is the sole Reel release format. V2, brief, flash, learn and campaign Reel
generators are retained only as historical code and assets. They must not publish.
Site briefs and flash articles continue independently; a news event does not itself
authorise a Reel.

This is a permanent rule for present and future work. It applies to every new
format, queue item, renderer and manual publish path unless Prabal explicitly
changes it in this document.

There is no daily Reel quota. A market fact alone is not a story. Publish only when
the viewer gets useful context: what changed, why the obvious interpretation may be
wrong, who feels the consequence, and the specific fact to check next.

The operating cadence is three V3 releases each week—Monday, Wednesday and Friday
at 7:30 PM IST. Use one current-context story, one durable mechanism and one
options/contract-risk lesson where the slate supports it. A material event may
replace a planned story, but never creates an extra quota post.

## Purpose

Make one market mechanism understandable in one viewing. Each Reel earns attention
with a real viewer confusion, shows the missing causal link, and leaves a repeatable
check—not a trading instruction.

## Editorial mindset

Be decisive about the interpretation, not prescriptive about a position. The tone is
high-conviction, stakes-aware and plain-spoken: identify what the market may be
missing, show the evidence, name what would invalidate the read, and make clear who
is exposed. It should feel like a sharp market operator explaining the boardroom
implication—not a textbook, a motivational presenter or a tip channel.

Every V3 story follows this narrative spine:

1. **Tension:** the fact that looks obvious but is incomplete.
2. **Mechanism:** the one causal link that explains the apparent contradiction.
3. **Stakes:** who is affected and why it matters in India.
4. **Decision-check:** the next source, unit, contract rule or event to verify.
5. **Boundary:** no instruction to buy, sell, hold, enter, exit or predict price.

"What to do" therefore means a repeatable information action—match units, check a
contract specification, compare actual versus expected data, or separate an input
price from a consumer bill—not a recommendation to trade.

## Required V3 brief

Every queue entry must have a short hook, one-sentence mechanism, three concise
visual steps, conclusion, voiceover, caption, primary-source label and direct HTTPS
source URL. `scripts/lib/reelV3Compliance.mjs` blocks missing fields, unsafe copy,
oversized hooks/voiceovers and non-primary-looking source references.

- Hook: a concrete misconception, consequence or comparison; never a generic lesson title.
- Mechanism: one causal chain. Do not put two lessons in the same Reel.
- Stakes: name the affected buyer, business, hedger or contract-holder where it is
  genuinely supported; do not manufacture urgency.
- Decision-check: end on the one fact that would confirm or challenge the story,
  rather than a generic engagement CTA.
- Visual: a distinct movement or comparison for each causal step. A presenter can
  guide the story but cannot substitute for the explanation.
- Boundary: educational explanation only; no prediction, trade call, target or promise.
- Voice: female Indian English (`en-IN-NeerjaNeural`), clear and conversational.
- Source: original exchange, regulator, official data publisher, or primary industry body.
- Caption: source URL, caveat and only natural, topic-specific hashtags.

## Visual and audio standard

Render at 1080x1920 with sound, vertical composition and essential copy within the
safe area. Meta recommends 9:16 video with audio and key content in safe zones;
the V3 renderer keeps source/caveat above the lower interface controls. Music is
subordinate to narration. Review the exported MP4 muted and with sound before any
format change is released.

Every concept needs a visual grammar suited to its mechanism:

| Mechanism | Required visual action |
| --- | --- |
| Price comparison | Match unit, currency and product before comparing values |
| Contract mechanics | Reveal lot size/tick/expiry as a contract card changes |
| Options | Hold the underlying move constant while one premium driver changes |
| Price transmission | Show the intervening layers, not a direct arrow to a consumer bill |
| Market session | Show which market is open and what information continues to arrive |

Avoid static title cards, decorative charts, zoom-only cuts, fake live numbers,
generic "save this" endings and repetitive presenter-only sequences.

## Release contract

1. `check-reel-v3-consistency.mjs` passes before CI accepts a queue change.
2. The daily workflow renders one V3 candidate and archives its MP4/TXT as an
   Action artifact for 90 days.
3. Instagram publishing is allowed only for `public/reels/v3/*`; review/draft
   artifacts and all legacy files are rejected by the shared publisher.
4. A failed Instagram post fails the Action and prevents queue state persistence;
   the same topic remains next in line.
5. `data/reel-history.json` receives the actual Instagram ID and timestamp only
   after Meta reports a successful publish.

## Editorial rotation and measurement

Maintain coverage across gold, silver, crude, copper, aluminium, options and
practical learning. A queue is not a licence to publish gold repeatedly. Measure
the first observation after 24 hours and a later observation after seven days;
compare watch time, watch-time/duration and measured saves/shares per reach. Keep
missing metrics null, never zero. Change one creative variable at a time after a
meaningful set of comparable releases.

## References

- [Meta Reels creative guidance](https://www.facebook.com/business/ads/facebook-instagram-reels-ads): 9:16, audio and safe-zone guidance.
- [Meta copyright guidance](https://www.facebook.com/help/354736791367645/): use content created or licensed by BhaavBrief.
- [Meta Sound Collection guidance](https://www.facebook.com/help/instagram/402084904469945): commercial-use music availability.
