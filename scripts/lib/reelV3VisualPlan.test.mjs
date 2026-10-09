import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { visualPlanFor, VISUAL_MODES } from './reelV3VisualPlan.mjs'

const slate = JSON.parse(readFileSync(new URL('../../data/reel-v3-editorial-slate.json', import.meta.url), 'utf8')).reels

describe('visualPlanFor', () => {
  it('reads the mode off the entry and passes the steps through as labels', () => {
    const reel = { id: 'x-001', visual_mode: 'contract', steps: ['A', 'B', 'C'] }
    expect(visualPlanFor(reel)).toEqual({ mode: 'contract', labels: ['A', 'B', 'C'] })
  })

  it('throws rather than silently falling back to a generic render', () => {
    // The 24cad756 regression: the mode silently resolved to something the
    // renderer had no branch for, and nothing anywhere complained.
    expect(() => visualPlanFor({ id: 'x-001', steps: [] })).toThrow(/Unknown visual_mode/)
    expect(() => visualPlanFor({ id: 'x-001', visual_mode: 'exchange', steps: [] })).toThrow(/Unknown visual_mode/)
    expect(() => visualPlanFor(undefined)).toThrow(/Unknown visual_mode/)
  })
})

describe('the live slate', () => {
  it('declares a renderable visual_mode on every entry', () => {
    for (const reel of slate) {
      expect(VISUAL_MODES, `${reel.id} has an unrenderable mode`).toContain(reel.visual_mode)
      expect(() => visualPlanFor(reel)).not.toThrow()
    }
  })

  it('does not render every story through one template', () => {
    // The standard's point: a comparison and a contract card must not look the
    // same. One distinct mode across a 7-story slate means the grammar is gone.
    expect(new Set(slate.map(r => r.visual_mode)).size).toBeGreaterThan(1)
  })

  it('gives drawVisual the three labels it indexes', () => {
    for (const reel of slate) expect(visualPlanFor(reel).labels).toHaveLength(3)
  })
})
