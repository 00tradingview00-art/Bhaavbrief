/**
 * scripts/lib/reelTiming.mjs — computes per-phase reel frame boundaries from
 * a planned/baseline timing plan and (optionally) a real measured voiceover
 * duration. Extracted from generate-brief-reel.mjs's inline rescale block so
 * both the English and Hindi voiceover passes can each get their own
 * correctly-scaled timing instead of Hindi borrowing English's duration
 * (the bug that caused Hindi audio to get truncated or leave dead air).
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/**
 * @param {{COVER_DUR:number, HOOK_DUR:number, BEAT1_DUR:number, BEAT2_DUR:number,
 *   BEAT3_DUR:number, PAYOFF_DUR:number, CTA_DUR:number}} baseline - planned,
 *   unscaled per-phase durations in seconds (CTA_DUR is never scaled — it's a
 *   silent/music-only outro, not part of the spoken script)
 * @param {number|null|undefined} measuredVoiceDur - real voiceover length in
 *   seconds, or null/undefined/NaN/<=0 to keep the planned baseline as-is
 * @param {number} fps
 * @returns {{HOOK_DUR:number, BEAT1_DUR:number, BEAT2_DUR:number, BEAT3_DUR:number,
 *   PAYOFF_DUR:number, COVER_END:number, HOOK_END:number, BEAT1_END:number,
 *   BEAT2_END:number, BEAT3_END:number, PAYOFF_END:number, CTA_END:number,
 *   TOTAL_FRAMES:number, scale:number, rawScale:number|null, clamped:boolean}}
 */
export function computeReelTiming(baseline, measuredVoiceDur, fps) {
  const { COVER_DUR, HOOK_DUR: hookBase, BEAT1_DUR: beat1Base, BEAT2_DUR: beat2Base,
          BEAT3_DUR: beat3Base, PAYOFF_DUR: payoffBase, CTA_DUR } = baseline
  const speechBaseline = hookBase + beat1Base + beat2Base + beat3Base + payoffBase

  let scale = 1
  let rawScale = null
  let clamped = false
  if (measuredVoiceDur != null && Number.isFinite(measuredVoiceDur) && measuredVoiceDur > 0) {
    rawScale = measuredVoiceDur / speechBaseline
    // Clamp the rescale factor — a wildly small/large factor almost certainly
    // means something else went wrong (empty/garbled audio), not a
    // legitimately fast/slow read of this particular script.
    scale = clamp(rawScale, 0.7, 1.8)
    clamped = Math.abs(rawScale - scale) > 0.01
  }

  const HOOK_DUR   = hookBase   * scale
  const BEAT1_DUR  = beat1Base  * scale
  const BEAT2_DUR  = beat2Base  * scale
  const BEAT3_DUR  = beat3Base  * scale
  const PAYOFF_DUR = payoffBase * scale

  const COVER_END  = Math.round(COVER_DUR  * fps)
  const HOOK_END   = COVER_END  + Math.round(HOOK_DUR   * fps)
  const BEAT1_END  = HOOK_END   + Math.round(BEAT1_DUR  * fps)
  const BEAT2_END  = BEAT1_END  + Math.round(BEAT2_DUR  * fps)
  const BEAT3_END  = BEAT2_END  + Math.round(BEAT3_DUR  * fps)
  const PAYOFF_END = BEAT3_END  + Math.round(PAYOFF_DUR * fps)
  const CTA_END    = PAYOFF_END + Math.round(CTA_DUR    * fps)

  return {
    HOOK_DUR, BEAT1_DUR, BEAT2_DUR, BEAT3_DUR, PAYOFF_DUR,
    COVER_END, HOOK_END, BEAT1_END, BEAT2_END, BEAT3_END, PAYOFF_END, CTA_END,
    TOTAL_FRAMES: CTA_END, scale, rawScale, clamped,
  }
}
