import { describe, it, expect } from 'vitest'
import { mcxNotYetTraded } from './mcxPreOpen.mjs'

const row = (price, prevClose = price) => ({ price, prevClose, changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0 })

describe('mcxNotYetTraded', () => {
  it('is true for the 05 Oct 2026 08:37 IST snapshot (every MCX row at its previous close)', () => {
    expect(mcxNotYetTraded({ instruments: {
      MCX_GOLD: row(150390), MCX_SILVER: row(225877), MCX_CRUDE: row(8916),
      MCX_COPPER: row(1399.6), MCX_NATGAS: row(287.5),
      COMEX_SILVER: row(61.35, 59.98), // overseas markets did move
    } })).toBe(true)
  })

  it('is false once any MCX contract has traded away from its close', () => {
    expect(mcxNotYetTraded({ instruments: {
      MCX_GOLD: row(150500, 150390), MCX_SILVER: row(225877), MCX_CRUDE: row(8916),
    } })).toBe(false)
  })

  it('is false when there are too few MCX rows to tell', () => {
    expect(mcxNotYetTraded({ instruments: { MCX_GOLD: row(150390), MCX_SILVER: row(225877) } })).toBe(false)
  })

  it('ignores rows with no price', () => {
    expect(mcxNotYetTraded({ instruments: {
      MCX_GOLD: row(150500, 150390), MCX_SILVER: row(225877), MCX_CRUDE: row(8916), MCX_ZINC: row(0, 0),
    } })).toBe(false)
  })

  it('handles a missing snapshot', () => {
    expect(mcxNotYetTraded(null)).toBe(false)
  })
})
