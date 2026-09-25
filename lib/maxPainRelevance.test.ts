import { describe, it, expect } from 'vitest'
import { relevanceOf } from './maxPainRelevance'

// Max Pain's "futures gravitate here" framing only has real basis close to
// expiry, close to price, with genuinely concentrated OI — not as a
// standing property of the number. These lock in the thresholds that make
// that conditional, so the copy in app/tools/mcx-max-pain/page.tsx stays
// honest as the code changes.
describe('relevanceOf', () => {
  it('is High when near expiry, close to the strike, and OI is concentrated there', () => {
    expect(relevanceOf(5, 1.2, 12)).toBe('High')
  })

  it('is not High when OI at the strike is not actually concentrated', () => {
    expect(relevanceOf(5, 1.2, 3)).toBe('Moderate')
  })

  it('is Moderate when further from expiry or the strike, but not extreme', () => {
    expect(relevanceOf(12, 4, 5)).toBe('Moderate')
  })

  it('is Low when far from both expiry and the strike', () => {
    expect(relevanceOf(25, 8, 20)).toBe('Low')
  })

  it('is Low when either dte or gap is unavailable', () => {
    expect(relevanceOf(null, 1, 10)).toBe('Low')
    expect(relevanceOf(5, null, 10)).toBe('Low')
  })
})
