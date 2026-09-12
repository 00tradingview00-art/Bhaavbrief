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
  editorial_brief: {
    viewer_question: 'Why are these gold references different?',
    misconception: 'Every gold screen should match.',
    mechanism: 'Each screen refers to a different market or retail price.',
    proof_plan: 'Show the relevant exchange and market labels.',
    boundary: 'This is not a view on where gold goes next.',
    memory_check: 'Name the price reference before comparing.',
    human_opening: 'A family jewellery quote differs from the gold chart on your phone.',
    primary_source: 'MCX contract specification and World Gold Council market data.',
    save_frame: 'Before comparing gold, name the reference: global, MCX, or retail.',
    voice_tone: 'Warm, matter-of-fact friend explaining a confusing moment.',
  },
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

  it('requires the audience-first editorial quality gate', () => {
    const { save_frame, ...withoutSaveFrame } = safe.editorial_brief
    expect(validateReelV2({ ...safe, editorial_brief: withoutSaveFrame }))
      .toContain('Missing editorial brief field: save_frame')
  })

  it('rejects an engagement CTA disguised as a save frame', () => {
    expect(validateReelV2({
      ...safe,
      editorial_brief: { ...safe.editorial_brief, save_frame: 'Follow us for more market explanations.' },
    })).toContain('Save frame must give a repeatable check, not an engagement CTA')
  })

  it('blocks advisory language hidden only in a storyboard scene, since that copy is burned onto the video', () => {
    expect(validateReelV2({
      ...safe,
      storyboard: [{ seconds: '0.0-2.0', copy: 'Buy gold now.' }],
    }).join('\n')).toMatch(/Action\/advice language/)
  })

  it('blocks a storyboard line with too many words to fit the frame', () => {
    expect(validateReelV2({
      ...safe,
      storyboard: [{ seconds: '0.0-2.0', copy: 'This single on-screen line has way too many words to fit safely' }],
    }).join('\n')).toMatch(/exceeds 8 words/)
  })

  it('blocks storyboard copy with more manual line breaks than the frame allows', () => {
    expect(validateReelV2({
      ...safe,
      storyboard: [{ seconds: '0.0-2.0', copy: 'LINE ONE\nLINE TWO\nLINE THREE' }],
    }).join('\n')).toMatch(/more than 2 lines/)
  })

  it('blocks an unledgered historical statistic in the copy', () => {
    expect(validateReelV2({
      ...safe,
      voiceover: `Gold has historically moved 5% on this event. ${REQUIRED_DISCLAIMER}`,
    }).join('\n')).toMatch(/CLAIMS:/)
  })

  it('accepts a historical statistic backed by a matching claims-ledger entry', () => {
    const withStat = {
      ...safe,
      voiceover: `Gold has historically moved 5% on this event. ${REQUIRED_DISCLAIMER}`,
    }
    const claims = [{ claim_id: 'some_event__gold', values: { avgAbsMovePct: 5 } }]
    expect(validateReelV2(withStat, claims).join('\n')).not.toMatch(/CLAIMS:/)
  })
})
