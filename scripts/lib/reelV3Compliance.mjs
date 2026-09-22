/** The release contract for every V3 Reel manifest/queue entry. */
const ACTION = /\b(?:buy|sell|go long|go short|invest|recommend|target price|stop[- ]?loss)\b/i
const PREDICTION = /\b(?:will|likely to|expected to)\s+(?:rise|fall|rally|crash|surge|plunge)\b/i
const words = (text = '') => text.trim().split(/\s+/).filter(Boolean)

export function validateReelV3(reel) {
  const issues = []
  for (const field of ['id', 'hook', 'hook_detail', 'mechanism', 'stakes', 'decision_check', 'boundary', 'conclusion', 'source', 'source_url', 'voiceover', 'caption']) {
    if (!reel?.[field]) issues.push(`Missing required field: ${field}`)
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-\d{3}$/.test(reel?.id ?? '')) issues.push('ID must end in a three-digit release number')
  if (words(reel?.hook).length > 9) issues.push('Hook exceeds 9 words')
  if (words(reel?.voiceover).length < 24 || words(reel?.voiceover).length > 52) issues.push('Voiceover must be 24–52 words for the 15-second format')
  if (!Array.isArray(reel?.steps) || reel.steps.length !== 3 || reel.steps.some(step => words(step).length > 3)) issues.push('Exactly three concise mechanism steps are required')
  if (!/^https:\/\//.test(reel?.source_url ?? '')) issues.push('Source must be a direct HTTPS URL to a primary publisher')
  const copy = [reel?.hook, reel?.hook_detail, reel?.mechanism, reel?.stakes, reel?.decision_check, reel?.boundary, reel?.conclusion, reel?.voiceover, reel?.caption].filter(Boolean).join('\n')
  if (ACTION.test(copy)) issues.push('Action/advice language is not permitted')
  if (PREDICTION.test(copy)) issues.push('Directional prediction language is not permitted')
  if (/\b(?:follow|like|comment|share|save this)\b/i.test(reel?.decision_check ?? '')) issues.push('Decision-check must be a repeatable verification, not an engagement CTA')
  return issues
}
