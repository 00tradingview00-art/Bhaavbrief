import { describe, it, expect } from 'vitest'
import { priceSanityIssues } from './researchPriceCheck.mjs'

// market-snapshot.json's real shape (the old check read a non-existent `prices` key).
const instruments = {
  MCX_GOLD: { price: 146962 }, MCX_SILVER: { price: 226195 }, MCX_CRUDE: { price: 8630 },
  MCX_COPPER: { price: 1403.85 }, MCX_NATGAS: { price: 291.5 },
}

describe('research price sanity', () => {
  it('passes correctly stated prices (phrasings from published research)', () => {
    const body = 'MCX Gold futures are at ₹1,46,500. MCX Silver at ₹2,30,000, MCX Crude at ₹8,700 and Natural Gas at ₹290.'
    expect(priceSanityIssues(body, instruments)).toEqual([])
  })

  it("catches another commodity's price attributed to gold", () => {
    const issues = priceSanityIssues('MCX Gold futures are at ₹2,26,195 this morning.', instruments)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatch(/gold is 54% off/)
  })

  it('catches a figure an order of magnitude too high', () => {
    expect(priceSanityIssues('MCX Crude settled at ₹86,300.', instruments)).toHaveLength(1)
  })

  it('ignores premiums, ranges and spreads that are not price quotes', () => {
    const body = 'Gold is trading within ₹44 of max pain; the gold basis is ₹15,445.6; Crude is trading ₹40 above.'
    expect(priceSanityIssues(body, instruments)).toEqual([])
  })

  it("attributes a figure to the nearest commodity named before it (not any nearby word)", () => {
    // Silver's price following a gold mention earlier in the sentence is silver's, and correct.
    expect(priceSanityIssues('Unlike gold, which held, Silver moved to ₹2,31,000.', instruments)).toEqual([])
  })

  it('known limit: a figure ~10× too low is not distinguishable from a basis/spread figure', () => {
    expect(priceSanityIssues('MCX Gold at ₹14,696.', instruments)).toEqual([])
  })

  it('does nothing when the snapshot has no instruments', () => {
    expect(priceSanityIssues('MCX Gold at ₹9,99,999', {})).toEqual([])
  })
})
