import { describe, expect, it } from 'vitest'
import { REQUIRED_DISCLAIMER, validateReelV2 } from './reelV2Compliance.mjs'

const safe = {
  id: 'price-you-feel-gold-001',
  series: 'price-you-feel',
  hook: 'Gold changed your wedding budget overnight.',
  voiceover: `Gold moved overnight. Indian prices reflect global gold and the rupee. A jewellery quote can change before breakfast. ${REQUIRED_DISCLAIMER}`,
  overlays: [REQUIRED_DISCLAIMER],
  caption: 'A data-led explanation of how global gold reaches an Indian jewellery price.',
  uses_live_data: true,
  uses_synthetic_persona: false,
  voice_profile: 'female',
  review_status: 'approved',
}

describe('validateReelV2', () => {
  it('accepts an approved, educational live-data reel', () => {
    expect(validateReelV2(safe)).toEqual([])
  })

  it('blocks a reel that has not passed human review', () => {
    expect(validateReelV2({ ...safe, review_status: 'draft' })).toContain('Reel is not human-approved')
  })

  it('blocks advisory language in any publishable copy', () => {
    expect(validateReelV2({ ...safe, caption: 'Buy gold now.' }).join('\n')).toMatch(/Action\/advice language/)
  })

  it('requires a disclaimer for live data', () => {
    const { overlays, ...withoutDisclaimer } = safe
    expect(validateReelV2({ ...withoutDisclaimer, voiceover: 'Gold moved overnight.' })).toContain(`Live-data reel must include: "${REQUIRED_DISCLAIMER}"`)
  })

  it('blocks a narrator profile other than female', () => {
    expect(validateReelV2({ ...safe, voice_profile: 'male' })).toContain('Voice profile must be "female"')
  })
})
