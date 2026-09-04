/**
 * scripts/lib/reelHindiCopy.mjs — parses the Hindi translation Haiku call's
 * JSON response (see prompts/reel_hindi_v1.md) into the 7 fields that get
 * merged onto the English copy object. On-screen text must never end up
 * blank, so any missing/empty/non-string field falls back to the English
 * value for just that field rather than failing the whole translation.
 */

const HINDI_COPY_FIELDS = ['hook_caption', 'stat_line', 'beat1', 'beat2', 'beat3', 'payoff', 'voiceover']

function parseJson(raw) {
  try { return JSON.parse(raw) }
  catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error(`Hindi copy JSON parse failed: ${raw.slice(0, 200)}`)
  }
}

/**
 * @param {string} rawText - raw Haiku response text
 * @param {Record<string, string>} englishCopy - the English copy object (must
 *   contain at least the HINDI_COPY_FIELDS keys) to fall back to per-field
 * @returns {Record<string, string>} object with exactly the 7 translated
 *   fields, each guaranteed to be a non-empty string
 */
export function parseHindiCopyResponse(rawText, englishCopy) {
  let parsed
  try { parsed = parseJson(rawText.trim()) }
  catch { parsed = {} }

  const result = {}
  for (const field of HINDI_COPY_FIELDS) {
    const value = parsed?.[field]
    result[field] = typeof value === 'string' && value.trim() ? value.trim() : englishCopy[field]
  }
  return result
}
