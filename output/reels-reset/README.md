# Reels reset — first creative draft

[Watch the 12.1-second pilot](gold-rupee-reset-001-draft.mp4)

Hook: **Gold didn't move. Your price did.**
This is the gold slot, not the programme's full scope. The active rotation covers
gold, silver, crude, copper, aluminium, options and learning twice each. Silver is
next; the specialised currency renderer is not an automated renderer for all lanes.

One currency mechanism, 29 spoken words, three scenes, answer starts at 2.8s.
The $100 and exchange rates are illustrative. They are not today's prices or the
price of the pictured bangle. The dollar amount stays constant while rupee cost changes.

- [Active plan and 14-post coverage queue](../../docs/reels-v2-production-blueprint.md)
- [Manifest, script and sources](../../reels/v2/gold-rupee-reset-001.json)
- [Caption](caption.txt)
- [Frame 1](frame-1.png), [comparison](frame-3.png), [ending](frame-4.png)
- [Original image](../../public/reels/v2/assets/gold-rupee-reset-001.png)
- [Exact image-generation prompt](../../reels/v2/gold-rupee-reset-001-image-prompt.txt)
- [Measured scene/audio timeline](render.json)

The built-in imagegen tool produced the bangle art; code renders the typography,
currency arithmetic and animation. No public market price is fabricated.

## Current status

Draft only. ElevenLabs returned quota exceeded: zero credits remaining. The
export uses Samantha, a temporary local female voice. Its caption timing is
approximate; the premium path uses provider character alignment. The configured
premium voice was verified as Sarah (female, American accent); an Indian-English
voice remains a voice-selection improvement before release.

This work is in branch `codex/reels-reset-20260914`, isolated worktree
`/Users/prabalkapoor/Downloads/bhaavbrief-reels-reset`. Changes have not been pushed,
deployed or posted. Existing Instagram posts and live schedules were not changed.
The source repo was not edited. Old planning files are retained with superseded
notices. Agent instructions now point to the single active plan in this worktree.

## Verification

- Full suite: 58 files, 595 tests passed.
- TypeScript check passed. Lint passed with the existing unused `circuitLimit`
  warning in `components/mcx/StrategyBuilder.tsx`.
- All approved V2 manifests still pass their original compliance gate. New pilot
  remains a draft and passes its non-approval checks.
- Export: H.264, 1080×1920, 30fps, AAC stereo; 12.1 seconds.
- Narration per scene is measured before render; no spoken ending is truncated.
- Keyframes inspected; corrected missing rupee glyph using the existing Devanagari
  font. Text layout throws on overflow. First-frame hook has no fade-in delay.
- Technical audio scan checked levels and matching stream duration. Full subjective
  listening review is still required; native playback automation failed and browser
  policy blocked opening the local video. The file is available directly above.
- No application code was changed; a full site build was not run.

## Reproduce

From this worktree:

```sh
node scripts/analyze-reel-history.mjs
node scripts/render-reel-v2-reset.mjs --local-voice
```

After premium credits are restored, omit `--local-voice` to generate verified female
narration with provider alignment. That still produces a review draft, never a post.
`--frames-only` permits fast visual review. The cache avoids regenerating unchanged
audio; rendered outputs are outside the Instagram auto-pick directories.

Before release: replace the temporary voice, review the complete export with sound,
approve the final creative, and apply the plan's legacy-reel pause. Do not mark this
draft approved or treat generation as evidence of better engagement. Measure the
actual released pilot at 24 hours and seven days with the updated collector.
