// V3 visual grammar is chosen per mechanism, never by a one-size-fits-all card row.
//
// The mode is a required field on the slate entry itself (`visual_mode`), not a
// lookup keyed by ID. An ID table used to live here and silently fell behind:
// commit 24cad756 replaced every slate ID, the table kept the old keys, all
// seven live stories resolved to a default that had no renderer branch, and
// nothing failed — the visual grammar simply stopped happening for three weeks
// while CI reported the queue as passing. Keeping the mode in the data means a
// new story cannot be added without declaring one, and `validateReelV3`
// rejects an unknown value.

/** Modes with a real branch in the renderer's drawVisual(). */
export const VISUAL_MODES = ['comparison', 'contract', 'options', 'session', 'transmission', 'flow']

export function visualPlanFor(reel) {
  const mode = reel?.visual_mode
  if (!VISUAL_MODES.includes(mode)) {
    throw new Error(`Unknown visual_mode "${mode}" for ${reel?.id ?? 'unknown reel'} — expected one of ${VISUAL_MODES.join(', ')}`)
  }
  return { mode, labels: reel.steps }
}
