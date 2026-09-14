import { it, expect } from 'vitest'
import { assertNarrationFits } from './reelV2Timing.mjs'
it('rejects a voice track that would be cut by the visual duration', () => {
  expect(() => assertNarrationFits(18.8, 16)).toThrow(/never trim/)
  expect(() => assertNarrationFits(16, 16)).toThrow(/never trim/)
  expect(() => assertNarrationFits(NaN, 16)).toThrow(/finite/)
  expect(() => assertNarrationFits(15.5, 16)).not.toThrow()
})
