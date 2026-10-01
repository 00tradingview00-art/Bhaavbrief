import { describe, expect, test } from 'vitest'
import { OI_PRESSURE_COPY, oiPressureView } from './oiPressure'
import { visualCopyViolations } from './visualCopyCompliance'

const ce = [{ strike: 6900, oi: 900 }, { strike: 6950, oi: 1200 }, { strike: 6850, oi: 400 }, { strike: 7000, oi: 300 }, { strike: 6800, oi: 100 }]
const pe = [{ strike: 6800, oi: 1000 }, { strike: 6750, oi: 700 }, { strike: 6850, oi: 300 }, { strike: 6700, oi: 200 }, { strike: 6650, oi: 50 }]

describe('oiPressureView', () => {
  test('orders strikes high to low with futures inserted where it falls', () => {
    const view = oiPressureView(ce, pe, 6842)!
    const order = view.rows.map(r => (r.kind === 'futures' ? 'F' : r.strike))
    expect(order).toEqual([7000, 6950, 6900, 6850, 'F', 6800, 6750, 6700, 6650])
    expect(view.maxOI).toBe(1200)
  })

  test('a strike missing from one side is null on that side, never 0', () => {
    const row = oiPressureView(ce, pe, 6842)!.rows.find(r => r.kind === 'strike' && r.strike === 7000)
    expect(row).toMatchObject({ callOI: 300, putOI: null })
  })

  test('flags the three largest concentrations per side', () => {
    const rows = oiPressureView(ce, pe, 6842)!.rows.filter(r => r.kind === 'strike')
    const callTop = rows.filter(r => r.kind === 'strike' && r.callTop).map(r => r.kind === 'strike' && r.strike)
    const putTop = rows.filter(r => r.kind === 'strike' && r.putTop).map(r => r.kind === 'strike' && r.strike)
    expect(callTop.sort()).toEqual([6850, 6900, 6950])
    expect(putTop.sort()).toEqual([6750, 6800, 6850])
  })

  test('futures above or below every strike goes at the matching end', () => {
    expect(oiPressureView(ce, pe, 9000)!.rows[0]).toEqual({ kind: 'futures', price: 9000 })
    expect(oiPressureView(ce, pe, 100)!.rows.at(-1)).toEqual({ kind: 'futures', price: 100 })
  })

  test('no open interest, no visual', () => {
    expect(oiPressureView([], [], 6842)).toBeNull()
    expect(oiPressureView([{ strike: 1, oi: 0 }], [], 6842)).toBeNull()
  })

  test('copy stays within the allowed language', () => {
    for (const text of Object.values(OI_PRESSURE_COPY)) expect(visualCopyViolations(text)).toEqual([])
  })
})
