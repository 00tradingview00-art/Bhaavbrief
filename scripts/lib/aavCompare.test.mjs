import { describe, it, expect } from 'vitest'
import { parseOfficialAav, toIsoDate, diffAav, maxAbsDiff } from './aavCompare.mjs'

// Synthetic values only — this repo is public and the exchange's data must not be committed.
const table = (rows, header = ['Commodity', 'Trading Date', '5-Day', '10-Day', '20-Day', '40-Day', '60-Day']) =>
  `<table><thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>` +
  rows.map(r => `<tr>${r.map(c => `<td style="x">${c}</td>`).join('')}</tr>`).join('') +
  '</tbody></table>'

describe('parseOfficialAav', () => {
  it('parses a single-date table into per-commodity windows', () => {
    const html = table([
      ['AAA', '18 Sep 2026', '1.10', '2.20', '3.30', '4.40', '5.50'],
      ['BBB', '18 Sep 2026', '10', '20', '30', '40', '50'],
    ])
    const r = parseOfficialAav(html)
    expect(r.date).toBe('2026-09-18')
    expect(r.byCommodity.AAA).toEqual({ '5d': 1.1, '10d': 2.2, '20d': 3.3, '40d': 4.4, '60d': 5.5 })
    expect(r.byCommodity.BBB['60d']).toBe(50)
  })

  it('rejects a changed header', () => {
    const html = table([['AAA', '18 Sep 2026', '1', '2', '3', '4', '5']], ['Name', 'Date', 'a', 'b', 'c', 'd', 'e'])
    expect(() => parseOfficialAav(html)).toThrow(/header/i)
  })

  it('rejects non-numeric values', () => {
    const html = table([['AAA', '18 Sep 2026', '1', 'n/a', '3', '4', '5']])
    expect(() => parseOfficialAav(html)).toThrow(/Non-numeric/)
  })

  it('rejects more than one trading date', () => {
    const html = table([
      ['AAA', '17 Sep 2026', '1', '2', '3', '4', '5'],
      ['AAA', '18 Sep 2026', '1', '2', '3', '4', '5'],
    ])
    expect(() => parseOfficialAav(html)).toThrow(/single trading date/)
  })

  it('rejects an empty file', () => {
    expect(() => parseOfficialAav('')).toThrow(/No data rows/)
  })
})

describe('toIsoDate', () => {
  it('converts DD Mon YYYY', () => {
    expect(toIsoDate('1 Jan 2027')).toBe('2027-01-01')
    expect(toIsoDate('18 Sep 2026')).toBe('2026-09-18')
  })
  it('throws on garbage', () => {
    expect(() => toIsoDate('2026-09-18')).toThrow(/Unrecognised/)
  })
})

describe('diffAav / maxAbsDiff', () => {
  const official = { '5d': 10, '10d': 20, '20d': 30, '40d': 40, '60d': 50 }
  it('reports ours minus official and leaves missing windows null', () => {
    const d = diffAav({ '5d': 11.5, '10d': 19, '20d': 30, '40d': 41.234, '60d': null }, official)
    expect(d['5d'].diff).toBe(1.5)
    expect(d['10d'].diff).toBe(-1)
    expect(d['20d'].diff).toBe(0)
    expect(d['40d'].diff).toBe(1.23)
    expect(d['60d']).toEqual({ ours: null, official: 50, diff: null })
  })
  it('maxAbsDiff ignores missing windows', () => {
    const d = diffAav({ '5d': 10, '10d': 17, '20d': null, '40d': null, '60d': null }, official)
    expect(maxAbsDiff(d)).toBe(3)
  })
  it('maxAbsDiff is null when nothing is comparable', () => {
    expect(maxAbsDiff(diffAav({}, official))).toBeNull()
  })
})
