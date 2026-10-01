import { describe, expect, test } from 'vitest'
import { IMPORT_REFERENCE_COPY, importReferenceView } from './importReference'
import { visualCopyViolations } from './visualCopyCompliance'

describe('importReferenceView', () => {
  test('places a premium right of the reference and says so', () => {
    const view = importReferenceView('MCX Gold', 0.62)!
    expect(view.position).toBeGreaterThan(50)
    expect(view.sentence).toBe('MCX Gold is trading above its import reference.')
  })

  test('places a discount left of the reference', () => {
    const view = importReferenceView('MCX Crude Oil', -1.4)!
    expect(view.position).toBeLessThan(50)
    expect(view.sentence).toBe('MCX Crude Oil is trading below its import reference.')
  })

  test('a gap that rounds to zero is described as in line', () => {
    expect(importReferenceView('MCX Silver', 0.001)!.sentence).toBe('MCX Silver is trading in line with its import reference.')
  })

  test('never pins the dot to an edge, even for an outlier', () => {
    const view = importReferenceView('MCX Gold', 9, [0.2, 0.4])!
    expect(view.position).toBeLessThanOrEqual(95)
    expect(view.position).toBeGreaterThanOrEqual(5)
  })

  test('recent sessions skip missing days and keep the last 30', () => {
    const history = [...Array.from({ length: 40 }, (_, i) => (i % 2 ? 0.5 : -0.5)), null, 0]
    const view = importReferenceView('MCX Gold', 0.3, history)!
    expect(view.recent).toHaveLength(30)
    expect(view.recent.at(-1)).toBe(0)
  })

  test('no reading, no visual', () => {
    expect(importReferenceView('MCX Gold', null)).toBeNull()
    expect(importReferenceView('MCX Gold', Number.NaN)).toBeNull()
  })

  test('copy stays within the allowed language', () => {
    const texts = [0.6, -0.6, 0].flatMap(v => {
      const view = importReferenceView('MCX Gold', v)!
      return [view.sentence, view.ariaLabel]
    })
    for (const text of [...texts, ...Object.values(IMPORT_REFERENCE_COPY)]) expect(visualCopyViolations(text)).toEqual([])
  })
})
