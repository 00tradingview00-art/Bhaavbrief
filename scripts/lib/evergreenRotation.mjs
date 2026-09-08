/**
 * scripts/lib/evergreenRotation.mjs — alternates the single shared
 * evergreen reel slot between 'learn' and 'campaign', replacing their
 * previous independent daily crons (see
 * .github/workflows/generate-evergreen-reel.yml). Pure toggle, no I/O.
 */

/**
 * @param {'learn'|'campaign'|null|undefined} lastType - data/evergreen-rotation.json's lastType
 * @returns {'learn'|'campaign'} today's type
 */
export function pickNextEvergreenType(lastType) {
  // No prior state (first run after migration, or a corrupted file)
  // self-heals to 'learn' — mirrors generate-learn-reel.mjs's own
  // pickNextSlug() self-healing when a stored lastSlug isn't found.
  if (lastType !== 'learn' && lastType !== 'campaign') return 'learn'
  return lastType === 'learn' ? 'campaign' : 'learn'
}
