import { describe, expect, test } from 'vitest'
import { METRIC_EXPLAINERS } from './metricExplainers'
import { visualCopyViolations } from './visualCopyCompliance'

describe('metric explainers', () => {
  test('every explainer line stays within the allowed language', () => {
    for (const explainer of Object.values(METRIC_EXPLAINERS)) {
      for (const text of [explainer.metric, explainer.shows, explainer.doesNotMean, explainer.linkLabel]) {
        expect(visualCopyViolations(text)).toEqual([])
      }
    }
  })

  test('every explainer has a non-advice boundary and an internal link', () => {
    for (const explainer of Object.values(METRIC_EXPLAINERS)) {
      expect(explainer.doesNotMean.length).toBeGreaterThan(20)
      expect(explainer.href.startsWith('/')).toBe(true)
    }
  })
})
