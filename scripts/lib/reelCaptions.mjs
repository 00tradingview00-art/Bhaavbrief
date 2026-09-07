/**
 * scripts/lib/reelCaptions.mjs — turns ElevenLabs' character-level alignment
 * (from the /with-timestamps endpoint) into word chunks with real start/end
 * times, for word-synced burned-in captions
 * (generate-brief-reel.mjs's drawCaptionOverlay).
 *
 * Deliberately decoupled from scripts/lib/reelTiming.mjs's phase boundaries:
 * those are planned proportions rescaled to the voiceover's total measured
 * length, but a caption needs to appear at the exact real second a word was
 * actually spoken — a proportional rescale can't give that, only the
 * alignment data itself can. So captions are a second, independently-timed
 * overlay drawn on top of whatever phase is on screen, not tied to
 * COVER/HOOK/BEAT/PAYOFF boundaries at all.
 *
 * The muxed voice track starts at t=0 of the final video (encodeReel's
 * `asetpts=PTS-STARTPTS`, no delay filter) — so a chunk's `start` in seconds
 * maps directly to a global frame number via `Math.round(start * fps)`, no
 * extra offset needed.
 */

/**
 * Groups ElevenLabs' flat per-character alignment into words, splitting on
 * whitespace. Whitespace characters themselves are dropped (they'd have to
 * be attributed to a word to keep a start/end time, and neither neighbor is
 * more "correct" than the other — not worth the ambiguity here).
 * @param {{characters: string[], character_start_times_seconds: number[], character_end_times_seconds: number[]}} alignment
 * @returns {Array<{text: string, start: number, end: number}>}
 */
export function charAlignmentToWords(alignment) {
  const chars = alignment?.characters
  const starts = alignment?.character_start_times_seconds
  const ends = alignment?.character_end_times_seconds
  if (!Array.isArray(chars) || !Array.isArray(starts) || !Array.isArray(ends)) return []
  if (chars.length !== starts.length || chars.length !== ends.length) return []

  const words = []
  let current = null
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (/^\s$/.test(ch)) {
      if (current) { words.push(current); current = null }
      continue
    }
    if (!current) current = { text: ch, start: starts[i], end: ends[i] }
    else { current.text += ch; current.end = ends[i] }
  }
  if (current) words.push(current)
  return words
}

/**
 * Groups words into fixed-size chunks (default 2-3 words), the standard
 * "TikTok caption" size — small enough to read at a glance, large enough
 * that captions don't flicker word-by-word.
 * @param {Array<{text:string, start:number, end:number}>} words
 * @param {number} wordsPerChunk
 * @returns {Array<{text: string, start: number, end: number}>}
 */
export function chunkWords(words, wordsPerChunk = 3) {
  if (!Array.isArray(words) || words.length === 0) return []
  const n = Math.max(1, Math.floor(wordsPerChunk))
  const chunks = []
  for (let i = 0; i < words.length; i += n) {
    const slice = words.slice(i, i + n)
    chunks.push({
      text: slice.map((w) => w.text).join(' '),
      start: slice[0].start,
      end: slice[slice.length - 1].end,
    })
  }
  return chunks
}

/**
 * The chunk covering a given time in seconds, or null if that time falls
 * outside every chunk (e.g. the silent CTA outro, after speech ends).
 * @param {Array<{text:string, start:number, end:number}>} chunks
 * @param {number} timeSec
 */
export function activeChunkForTime(chunks, timeSec) {
  if (!Array.isArray(chunks)) return null
  for (const c of chunks) {
    if (timeSec >= c.start && timeSec < c.end) return c
  }
  return null
}

/** Convenience wrapper — see activeChunkForTime. */
export function activeChunkForFrame(chunks, frame, fps) {
  return activeChunkForTime(chunks, frame / fps)
}
