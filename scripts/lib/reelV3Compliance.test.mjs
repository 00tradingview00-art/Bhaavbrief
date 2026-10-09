import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { validateReelV3 } from './reelV3Compliance.mjs'

const slate = JSON.parse(readFileSync(new URL('../../data/reel-v3-editorial-slate.json', import.meta.url), 'utf8')).reels

/** A minimal entry that passes, so each test can break exactly one thing. */
const valid = () => ({
  id: 'unit-test-001',
  hook: 'MARGIN ISNT YOUR RISK LIMIT.',
  hook_detail: 'The deposit is smaller than the contract exposure.',
  steps: ['MARGIN', 'CONTRACT VALUE', 'TICK VALUE'],
  visual_mode: 'contract',
  mechanism: 'Margin is a deposit behind a larger contract value.',
  stakes: 'A small displayed margin can hide a larger rupee exposure.',
  decision_check: 'Read contract size and tick value beside the margin figure.',
  boundary: 'A contract-risk explanation, not a participation recommendation.',
  conclusion: 'Read exposure, not just margin.',
  source: 'MCX INDIA',
  source_url: 'https://www.mcxindia.com/market-data/contract-specifications',
  voiceover: 'Margin is not a risk limit. It is the deposit behind a larger contract value. Price movement acts on that contract exposure, and tick value makes the rupee effect visible every single day.',
  caption: 'Margin is an entry deposit.',
})

describe('validateReelV3 — baseline', () => {
  it('accepts a complete entry', () => {
    expect(validateReelV3(valid())).toEqual([])
  })

  it('reports every missing required field', () => {
    const issues = validateReelV3({})
    for (const field of ['hook', 'mechanism', 'stakes', 'decision_check', 'boundary', 'conclusion', 'source', 'source_url', 'voiceover', 'caption']) {
      expect(issues).toContain(`Missing required field: ${field}`)
    }
  })
})

describe('validateReelV3 — visual_mode is a release blocker', () => {
  it('rejects a missing mode', () => {
    const { visual_mode, ...rest } = valid()
    expect(validateReelV3(rest).join()).toMatch(/visual_mode must be one of/)
  })

  it('rejects a mode the renderer has no branch for', () => {
    expect(validateReelV3({ ...valid(), visual_mode: 'exchange' }).join()).toMatch(/visual_mode must be one of/)
  })

  it('accepts each mode the renderer can actually draw', () => {
    for (const mode of ['comparison', 'contract', 'options', 'session', 'transmission', 'flow']) {
      expect(validateReelV3({ ...valid(), visual_mode: mode }), mode).toEqual([])
    }
  })
})

describe('validateReelV3 — the non-advice boundary', () => {
  it('rejects action and advice language anywhere in the copy', () => {
    expect(validateReelV3({ ...valid(), conclusion: 'Buy MCX gold now.' }))
      .toContain('Action/advice language is not permitted')
    expect(validateReelV3({ ...valid(), voiceover: `${valid().voiceover} We recommend a stop-loss.` }))
      .toContain('Action/advice language is not permitted')
  })

  it('rejects directional predictions', () => {
    expect(validateReelV3({ ...valid(), stakes: 'Gold will rally into expiry.' }))
      .toContain('Directional prediction language is not permitted')
  })

  it('rejects an engagement CTA in the decision-check', () => {
    expect(validateReelV3({ ...valid(), decision_check: 'Save this for later and follow us.' }))
      .toContain('Decision-check must be a repeatable verification, not an engagement CTA')
  })
})

describe('validateReelV3 — format limits for the 15-second render', () => {
  it('rejects an over-long hook', () => {
    expect(validateReelV3({ ...valid(), hook: 'One two three four five six seven eight nine ten' }))
      .toContain('Hook exceeds 9 words')
  })

  it('rejects a voiceover outside 24–52 words', () => {
    expect(validateReelV3({ ...valid(), voiceover: 'Too short.' }).join()).toMatch(/Voiceover must be 24–52 words/)
    expect(validateReelV3({ ...valid(), voiceover: 'word '.repeat(60) }).join()).toMatch(/Voiceover must be 24–52 words/)
  })

  it('requires exactly three short steps, because drawVisual indexes three labels', () => {
    expect(validateReelV3({ ...valid(), steps: ['A', 'B'] }).join()).toMatch(/Exactly three/)
    expect(validateReelV3({ ...valid(), steps: ['A', 'B', 'C', 'D'] }).join()).toMatch(/Exactly three/)
    expect(validateReelV3({ ...valid(), steps: ['A', 'B', 'one two three four'] }).join()).toMatch(/Exactly three/)
  })

  it('requires an HTTPS primary source', () => {
    expect(validateReelV3({ ...valid(), source_url: 'http://mcxindia.com' }).join()).toMatch(/direct HTTPS URL/)
  })

  it('requires a three-digit release number on the id', () => {
    expect(validateReelV3({ ...valid(), id: 'margin-exposure' }).join()).toMatch(/three-digit release number/)
  })
})

describe('the live slate passes its own contract', () => {
  it.each(slate.map(r => [r.id, r]))('%s', (_id, reel) => {
    expect(validateReelV3(reel)).toEqual([])
  })
})
