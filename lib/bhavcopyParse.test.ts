import { describe, it, expect } from 'vitest'
import {
  parseBhavcopy,
  parseBhavcopyAsync,
  parseTradingDate,
  parseExpiry,
  sniffBinaryKind,
  BhavcopyParseError,
  REQUIRED_COLUMNS,
} from './bhavcopyParse'

// Synthetic data only — this repo is public and the exchange's data must not be committed.

const HEADER = [...REQUIRED_COLUMNS]

// Column order: Date, Instrument Name, Symbol, Expiry Date, Option Type, Strike Price,
// Open, High, Low, Close, Previous Close, Volume(Lots), Volume(In 000's), Value(Lacs), Open Interest(Lots)
const FUT = ['18 Sep 2026', 'FUTCOM', 'AAA', '30SEP2026', '-', '0', '10.5', '11', '10', '10.8', '10.5', '20', '20.000 KGS', '5.50', '7']
const FUT_UNTRADED = ['18 Sep 2026', 'FUTCOM', 'AAA', '30OCT2026', '-', '0', '', '', '', '10.9', '10.9', '0', '0.000 KGS', '0.00', '0']
const CALL = ['18 Sep 2026', 'OPTFUT', 'AAA', '25SEP2026', 'CE', '100', '', '', '', '3.5', '3', '4', '4.000 KGS', '1.25', '9']

const html = (rows: string[][], header: string[] = HEADER) =>
  '<table><thead><tr>' + header.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>' +
  rows.map(r => '<tr>' + r.map(c => `<td style="padding:5px">${c}</td>`).join('') + '</tr>').join('') +
  '</tbody></table>'

const csv = (rows: string[][], header: string[] = HEADER) =>
  [header, ...rows].map(r => r.map(c => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\r\n')

describe('parseBhavcopy — HTML table', () => {
  it('parses futures and options rows into typed values', () => {
    const p = parseBhavcopy(html([FUT, FUT_UNTRADED, CALL]))
    expect(p.date).toBe('2026-09-18')
    expect(p.rows).toHaveLength(3)

    const [fut, untraded, call] = p.rows
    expect(fut).toMatchObject({
      instrument: 'FUTCOM', symbol: 'AAA', expiry: '30SEP2026', expiryISO: '2026-09-30',
      optionType: null, strike: null, open: 10.5, high: 11, low: 10, close: 10.8, prevClose: 10.5,
      volumeLots: 20, volumeQty: 20, unit: 'KGS', valueLacs: 5.5, oiLots: 7,
    })
    // Blank Open/High/Low on an untraded contract stay null — they are not zero.
    expect(untraded.open).toBeNull()
    expect(untraded.high).toBeNull()
    expect(untraded.low).toBeNull()
    expect(untraded.close).toBe(10.9)
    expect(call).toMatchObject({ optionType: 'CE', strike: 100, expiry: '25SEP2026', oiLots: 9 })
  })

  it('finds columns by name, so a reordered file still parses', () => {
    const order = [...HEADER].reverse()
    const idx = order.map(h => HEADER.indexOf(h))
    const reorder = (r: string[]) => idx.map(i => r[i])
    const p = parseBhavcopy(html([FUT].map(reorder), order))
    expect(p.rows[0]).toMatchObject({ symbol: 'AAA', close: 10.8, oiLots: 7 })
  })

  it('decodes HTML entities in cell text', () => {
    const r = [...FUT]
    r[2] = 'A&amp;B'
    expect(parseBhavcopy(html([r])).rows[0].symbol).toBe('A&B')
  })
})

describe('parseBhavcopy — CSV', () => {
  it('parses a CSV with the same header names, including quoted commas', () => {
    const r = [...FUT]
    r[12] = '1,234.500 KGS'
    const p = parseBhavcopy(csv([r, CALL]))
    expect(p.rows).toHaveLength(2)
    expect(p.rows[0].volumeQty).toBe(1234.5)
    expect(p.rows[1].optionType).toBe('CE')
  })
})

describe('parseBhavcopy — rejects bad input with a readable message', () => {
  const err = (text: string) => {
    try { parseBhavcopy(text) } catch (e) {
      expect(e).toBeInstanceOf(BhavcopyParseError)
      return (e as Error).message
    }
    throw new Error('expected parseBhavcopy to throw')
  }

  it('empty and whitespace-only files', () => {
    expect(err('')).toMatch(/empty/i)
    expect(err('   \n  ')).toMatch(/empty/i)
  })

  it('a header with no data rows', () => {
    expect(err(html([]))).toMatch(/No data rows/)
  })

  it('a file that is not a bhavcopy (missing columns), naming what is missing', () => {
    expect(err(html([['1', '2']], ['Foo', 'Bar']))).toMatch(/Missing columns: Date/)
  })

  it('more than one trading date', () => {
    const other = [...FUT]
    other[0] = '17 Sep 2026'
    expect(err(html([FUT, other]))).toMatch(/more than one trading date/)
  })

  it('a non-numeric price, naming the row and column', () => {
    const r = [...FUT]
    r[9] = 'abc'
    expect(err(html([FUT, r]))).toMatch(/Row 3.*"abc".*Close/)
  })

  it('a blank Close (only Open/High/Low may be blank)', () => {
    const r = [...FUT]
    r[9] = ''
    expect(err(html([r]))).toMatch(/Close column is blank/)
  })

  it('an unparseable date or expiry', () => {
    const d = [...FUT]; d[0] = '2026-09-18'
    expect(err(html([d]))).toMatch(/not a date/)
    const e = [...FUT]; e[3] = 'SEPT-30'
    expect(err(html([e]))).toMatch(/not an expiry/)
  })

  it('a row shorter than the header', () => {
    expect(err(html([FUT.slice(0, 10)]))).toMatch(/Row 2 has 10 columns/)
  })

  it('a malformed quantity', () => {
    const r = [...FUT]; r[12] = 'lots'
    expect(err(html([r]))).toMatch(/not a quantity/)
  })
})

describe('date helpers', () => {
  it('parseTradingDate accepts space and dash forms', () => {
    expect(parseTradingDate('18 Sep 2026')).toBe('2026-09-18')
    expect(parseTradingDate('1-Jan-2027')).toBe('2027-01-01')
    expect(parseTradingDate('31 December 2026')).toBe('2026-12-31')
  })
  it('parseTradingDate rejects other shapes', () => {
    expect(parseTradingDate('2026-09-18')).toBeNull()
    expect(parseTradingDate('18 Foo 2026')).toBeNull()
  })
  it('parseExpiry reads DDMMMYYYY', () => {
    expect(parseExpiry('30SEP2026')).toBe('2026-09-30')
    expect(parseExpiry('5oct2026')).toBe('2026-10-05')
    expect(parseExpiry('30-09-2026')).toBeNull()
  })
})

describe('sniffBinaryKind', () => {
  it('names an .xlsx (zip), a legacy binary xls and a PDF; passes text', () => {
    expect(sniffBinaryKind(new Uint8Array([0x50, 0x4b, 3, 4]))).toMatch(/xlsx/)
    expect(sniffBinaryKind(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]))).toMatch(/binary Excel/)
    expect(sniffBinaryKind(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toMatch(/PDF/)
    expect(sniffBinaryKind(new TextEncoder().encode('<table><tr>'))).toBeNull()
    expect(sniffBinaryKind(new Uint8Array([]))).toBeNull()
  })
})

describe('parseBhavcopyAsync', () => {
  it('gives exactly the same result as the synchronous parse, across several yield chunks', async () => {
    // 5,000 synthetic rows > the 2,000-row chunk size, so the parser yields to the event loop more than once.
    const many = Array.from({ length: 5000 }, (_, i) => {
      const r = [...FUT]
      r[2] = `S${i}`
      r[11] = String(i)
      return r
    })
    const text = html(many)
    const [a, b] = [parseBhavcopy(text), await parseBhavcopyAsync(text)]
    expect(b).toEqual(a)
    expect(b.rows).toHaveLength(5000)
    expect(b.rows[4999]).toMatchObject({ symbol: 'S4999', volumeLots: 4999 })
  })

  it('parses CSV and rejects the same bad input with the same message', async () => {
    expect((await parseBhavcopyAsync(csv([FUT, CALL]))).rows).toHaveLength(2)
    await expect(parseBhavcopyAsync('')).rejects.toThrow(/empty/i)
    await expect(parseBhavcopyAsync(html([]))).rejects.toThrow(/No data rows/)
    const other = [...FUT]
    other[0] = '17 Sep 2026'
    await expect(parseBhavcopyAsync(html([FUT, other]))).rejects.toThrow(/more than one trading date/)
  })
})

describe('HTML variants', () => {
  it('reads upper-case tags (regex fallback) the same way as lower-case', () => {
    const upper = html([FUT, CALL]).replace(/<(\/?)(tr|td|th|table|thead|tbody)/g, (_m, slash, tag) => `<${slash}${tag.toUpperCase()}`)
    expect(upper).toContain('<TR>')
    expect(parseBhavcopy(upper)).toEqual(parseBhavcopy(html([FUT, CALL])))
  })

  it('strips markup nested inside a cell and ignores attributes on rows and cells', () => {
    const text =
      '<table><tr class="h">' + HEADER.map(h => `<th><b>${h}</b></th>`).join('') + '</tr>' +
      '<tr style="x">' + FUT.map(c => `<td align="right"><span>${c}</span></td>`).join('') + '</tr></table>'
    expect(parseBhavcopy(text).rows[0]).toMatchObject({ symbol: 'AAA', close: 10.8 })
  })
})
