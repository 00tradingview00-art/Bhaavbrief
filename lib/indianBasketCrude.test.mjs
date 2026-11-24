import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  currentIndianFinancialYear,
  parseIndianBasketNote,
  fetchIndianBasketCrude,
} from './indianBasketCrude.mjs'

describe('currentIndianFinancialYear', () => {
  it('maps a date in April-December to FY starting that same year', () => {
    expect(currentIndianFinancialYear('2026-11-24')).toBe('2026-2027')
    expect(currentIndianFinancialYear('2026-04-01')).toBe('2026-2027')
  })

  it('maps a date in January-March to the FY that started the previous year', () => {
    expect(currentIndianFinancialYear('2026-03-31')).toBe('2025-2026')
    expect(currentIndianFinancialYear('2026-01-15')).toBe('2025-2026')
  })
})

describe('parseIndianBasketNote', () => {
  // Real response captured live from PPAC's AjaxController, 24 Nov 2026
  // (financialYear=2026-2027) — the exact shape and row count the live
  // endpoint returns, not a hand-built fixture.
  const liveResultCurrentFY = {
    1: { title: '2026-27', april: 114.48, total: 0 },
    2: { title: 'Notes :', colspan: '15' },
    3: {
      title:
        '- The Indian basket of Crude Oil represents a derived basket comprising of Sweet grade (Brent Dated) and Sour grade (Oman & Dubai average) of Crude oil imported by Indian refineries during each month. ICB Ratio for April 2026 is 61.02 : 38.98',
      colspan: '15',
    },
    4: {
      title:
        '- Crude Oil prices are average of daily prices of respective month. Average for the current month are till date.',
      colspan: '15',
    },
    5: { title: '- Crude Oil Indian Basket as on 19.11.2026 is $90.89/bbl.', colspan: '15' },
  }

  // Real response captured live for financialYear=2025-2026 — confirms the
  // older report used "$ 124.85" (space after the sign), so the regex must
  // tolerate both forms rather than assuming the newer one is permanent.
  const liveResultPriorFY = {
    1: { title: '2025-26', march: 61.4, total: 0 },
    2: { title: 'Notes :', colspan: '15' },
    5: { title: '- Crude Oil Indian Basket as on 31.03.2026 is $ 124.85/bbl.', colspan: '15' },
  }

  it('extracts the date and USD/bbl figure from the current-FY live response', () => {
    expect(parseIndianBasketNote(liveResultCurrentFY)).toEqual({
      date: '2026-11-19',
      usdPerBbl: 90.89,
    })
  })

  it('tolerates the older "$ 124.85" (space after $) format', () => {
    expect(parseIndianBasketNote(liveResultPriorFY)).toEqual({
      date: '2026-03-31',
      usdPerBbl: 124.85,
    })
  })

  it('does not assume a fixed row index — finds the note wherever it sits', () => {
    const shifted = { 1: liveResultCurrentFY[5], 2: liveResultCurrentFY[1] }
    expect(parseIndianBasketNote(shifted)).toEqual({ date: '2026-11-19', usdPerBbl: 90.89 })
  })

  it('returns null when no row matches (PPAC changed its note wording, or an empty report)', () => {
    expect(parseIndianBasketNote({ 1: { title: 'Notes :' } })).toBeNull()
    expect(parseIndianBasketNote({})).toBeNull()
  })

  it('returns null instead of throwing on a malformed/missing result', () => {
    expect(parseIndianBasketNote(null)).toBeNull()
    expect(parseIndianBasketNote(undefined)).toBeNull()
    expect(parseIndianBasketNote('not an object')).toBeNull()
  })
})

describe('fetchIndianBasketCrude', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('posts the expected form fields and parses a successful response', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          result: { 5: { title: '- Crude Oil Indian Basket as on 19.11.2026 is $90.89/bbl.' } },
        }),
        { status: 200 }
      )
    )
    const result = await fetchIndianBasketCrude({ dateStrIST: '2026-11-24' })
    expect(result).toEqual({ date: '2026-11-19', usdPerBbl: 90.89 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://ppac.gov.in/AjaxController/getInternationalPricesCrudeOil')
    expect(init.method).toBe('POST')
    const body = new URLSearchParams(init.body)
    expect(body.get('financialYear')).toBe('2026-2027')
    expect(body.get('reportBy')).toBe('4')
    expect(body.get('pageId')).toBe('30')
  })

  it('returns null (never throws) on a non-OK response', async () => {
    fetchMock.mockResolvedValue(new Response('error', { status: 500 }))
    expect(await fetchIndianBasketCrude({ dateStrIST: '2026-11-24' })).toBeNull()
  })

  it('returns null (never throws) when the network call rejects', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))
    expect(await fetchIndianBasketCrude({ dateStrIST: '2026-11-24' })).toBeNull()
  })

  it('returns null (never throws) on malformed JSON', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }))
    expect(await fetchIndianBasketCrude({ dateStrIST: '2026-11-24' })).toBeNull()
  })
})
