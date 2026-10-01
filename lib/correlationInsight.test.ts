import { describe, expect, test } from 'vitest'
import { CORRELATION_INSIGHT_COPY, correlationLinks } from './correlationInsight'
import { visualCopyViolations } from './visualCopyCompliance'
import type { CorrelationMatrix } from './correlation'

const matrix: CorrelationMatrix = {
  labels: ['Gold', 'Silver', 'Crude', 'USD/INR'],
  matrix: [
    [1, 0.82, 0.1, -0.45],
    [0.82, 1, 0.2, -0.3],
    [0.1, 0.2, 1, null],
    [-0.45, -0.3, null, 1],
  ],
  sampleSize: 20,
  priorMatrix: [
    [1, 0.6, 0.12, -0.44],
    [0.6, 1, 0.2, -0.3],
    [0.12, 0.2, 1, null],
    [-0.44, -0.3, null, 1],
  ],
  priorSampleSize: 20,
} as CorrelationMatrix

describe('correlationLinks', () => {
  test('strongest relationship first, described in words', () => {
    const links = correlationLinks(matrix, 0)
    expect(links.map(l => l.label)).toEqual(['Silver', 'USD/INR', 'Crude'])
    expect(links.map(l => l.description)).toEqual(['Closely moves together', 'Somewhat moves opposite', 'Little connection'])
  })

  test('flags a relationship that has strengthened against the prior window', () => {
    const links = correlationLinks(matrix, 0)
    expect(links.find(l => l.label === 'Silver')?.trend).toBe('stronger')
    expect(links.find(l => l.label === 'Crude')?.trend).toBeNull()
  })

  test('maps -1…1 onto the track', () => {
    const links = correlationLinks(matrix, 0)
    expect(links.find(l => l.label === 'Silver')?.position).toBeCloseTo(91, 0)
    expect(links.find(l => l.label === 'USD/INR')?.position).toBeCloseTo(27.5, 1)
  })

  test('leaves out pairs without enough history instead of calling them unrelated', () => {
    expect(correlationLinks(matrix, 2).map(l => l.label)).toEqual(['Silver', 'Gold'])
  })

  test('no prior window means no trend claim', () => {
    expect(correlationLinks({ ...matrix, priorMatrix: null }, 0).every(l => l.trend === null)).toBe(true)
  })

  test('copy stays within the allowed language', () => {
    const texts = [
      ...correlationLinks(matrix, 0).map(l => l.description),
      CORRELATION_INSIGHT_COPY.heading('Gold'),
      ...Object.values(CORRELATION_INSIGHT_COPY).flatMap(v => (typeof v === 'string' ? [v] : [])),
    ]
    for (const text of texts) expect(visualCopyViolations(text)).toEqual([])
  })
})
