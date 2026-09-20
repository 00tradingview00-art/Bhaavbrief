/**
 * lib/bhavcopyParse.ts — parse an exchange bhavcopy file, entirely client-side.
 *
 * The visitor downloads the file from the exchange themselves and drops it into
 * /tools/mcx-bhavcopy; nothing is uploaded and BhaavBrief stores none of it (the
 * exchange's terms forbid republishing its data). This module is pure — no
 * server imports — so it runs in the browser.
 *
 * Accepted input: the HTML <table> the exchange serves with an .xls extension,
 * or a CSV whose header row uses the same column names. Columns are located by
 * header NAME, so a reordered file still parses; anything else is rejected with
 * a plain-language message rather than guessed at.
 */

export const REQUIRED_COLUMNS = [
  'Date',
  'Instrument Name',
  'Symbol',
  'Expiry Date',
  'Option Type',
  'Strike Price',
  'Open',
  'High',
  'Low',
  'Close',
  'Previous Close',
  'Volume(Lots)',
  "Volume(In 000's)",
  'Value(Lacs)',
  'Open Interest(Lots)',
] as const

type Column = (typeof REQUIRED_COLUMNS)[number]

export interface BhavRow {
  /** FUTCOM / OPTFUT / FUTIDX / OPTIDX, as written in the file. */
  instrument: string
  symbol: string
  /** Expiry as written in the file, e.g. "30SEP2026". */
  expiry: string
  /** Expiry as YYYY-MM-DD, for sorting. */
  expiryISO: string
  optionType: 'CE' | 'PE' | null
  /** null for futures. */
  strike: number | null
  open: number | null
  high: number | null
  low: number | null
  close: number
  prevClose: number
  volumeLots: number
  /** Volume in thousands of `unit`, as the file's "Volume(In 000's)" column gives it. */
  volumeQty: number
  /** The contract's own unit (KGS, GRMS, BBL, mmBtu, UNIT, …). Volumes in different units must never be summed. */
  unit: string
  /** "Value(Lacs)" as given. Comparable across commodities, unlike volume. */
  valueLacs: number
  oiLots: number
}

export interface ParsedBhavcopy {
  /** Trading date, YYYY-MM-DD. */
  date: string
  rows: BhavRow[]
}

export class BhavcopyParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BhavcopyParseError'
  }
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function monthIndex(s: string): number {
  return MONTHS.indexOf(s.slice(0, 3).toLowerCase())
}

const pad2 = (n: number | string) => String(n).padStart(2, '0')

/** "18 Sep 2026" or "18-Sep-2026" -> "2026-09-18". */
export function parseTradingDate(s: string): string | null {
  const m = /^(\d{1,2})[\s\-/]+([A-Za-z]{3,9})[\s\-/]+(\d{4})$/.exec(s.trim())
  if (!m) return null
  const mi = monthIndex(m[2])
  return mi < 0 ? null : `${m[3]}-${pad2(mi + 1)}-${pad2(m[1])}`
}

/** "30SEP2026" -> "2026-09-30". */
export function parseExpiry(s: string): string | null {
  const m = /^(\d{1,2})([A-Za-z]{3})(\d{4})$/.exec(s.trim())
  if (!m) return null
  const mi = monthIndex(m[2])
  return mi < 0 ? null : `${m[3]}-${pad2(mi + 1)}-${pad2(m[1])}`
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/**
 * Every cell of every <tr>, as trimmed text — regex version. Case-insensitive, so it copes with
 * upper-case tags, but it is several times slower than htmlRows on a 15 MB file, so it is only
 * the fallback.
 */
function tableRowsRegex(html: string): string[][] {
  const rows: string[][] = []
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
  let tr: RegExpExecArray | null
  while ((tr = trRe.exec(html))) {
    const cells: string[] = []
    tdRe.lastIndex = 0
    let td: RegExpExecArray | null
    while ((td = tdRe.exec(tr[1]))) cells.push(decodeEntities(td[1].replace(/<[^>]*>/g, '')).trim())
    if (cells.length) rows.push(cells)
  }
  return rows
}

/**
 * Fast row scanner for lower-case <tr>/<td>/<th> markup (what the exchange serves): plain
 * indexOf, no backtracking. Yields one row (array of cell text) at a time so callers can
 * interleave work with the browser's event loop.
 */
function* htmlRows(txt: string): Generator<string[]> {
  let i = 0
  for (;;) {
    const a = txt.indexOf('<tr', i)
    if (a < 0) return
    const b = txt.indexOf('</tr>', a)
    if (b < 0) return
    const cells: string[] = []
    let j = txt.indexOf('>', a) + 1 // start after the opening <tr ...> tag
    for (;;) {
      const c = txt.indexOf('<t', j)
      if (c < 0 || c > b) break
      const start = txt.indexOf('>', c) + 1
      const end = txt.indexOf('</t', start)
      if (end < 0 || end > b) break
      let v = txt.slice(start, end)
      if (v.indexOf('<') >= 0) v = v.replace(/<[^>]*>/g, '')
      if (v.indexOf('&') >= 0) v = decodeEntities(v)
      cells.push(v.trim())
      j = end + 1
    }
    if (cells.length) yield cells
    i = b + 5
  }
}

/** Minimal RFC-4180 CSV: quoted fields, "" escapes, CRLF or LF. */
function csvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell.trim()); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell.trim()); cell = ''
      if (row.some(c => c !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell.trim())
  if (row.some(c => c !== '')) rows.push(row)
  return rows
}

function parseNumber(raw: string, column: string, line: number): number | null {
  if (raw === '' || raw === '-') return null
  const n = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(n)) {
    throw new BhavcopyParseError(`Row ${line}: "${raw}" in the ${column} column is not a number.`)
  }
  return n
}

/** Like parseNumber, but a blank is an error: only Open/High/Low are legitimately blank (untraded contracts). */
function requiredNumber(raw: string, column: string, line: number): number {
  const n = parseNumber(raw, column, line)
  if (n === null) throw new BhavcopyParseError(`Row ${line}: the ${column} column is blank.`)
  return n
}

/** "20.000 KGS" -> { qty: 20, unit: 'KGS' }. */
function parseQuantity(raw: string, line: number): { qty: number; unit: string } {
  const m = /^([\d,]*\.?\d+)\s*(.*)$/.exec(raw.trim())
  if (!m) throw new BhavcopyParseError(`Row ${line}: "${raw}" in the Volume(In 000's) column is not a quantity.`)
  return { qty: Number(m[1].replace(/,/g, '')), unit: m[2].trim() }
}

const isHtmlText = (text: string) => /<tr[\s>]/i.test(text)

/**
 * Validates the header of an extracted table (header row + data rows) and returns a converter for
 * its data rows. Split out from the loop so the UI can run the conversion in chunks.
 */
function rowBuilder(table: string[][]) {
  if (table.length < 2) throw new BhavcopyParseError('No data rows were found in the file.')

  const header = table[0]
  const idx = {} as Record<Column, number>
  const missing: string[] = []
  for (const name of REQUIRED_COLUMNS) {
    const i = header.findIndex(h => h.toLowerCase() === name.toLowerCase())
    if (i < 0) missing.push(name)
    else idx[name] = i
  }
  if (missing.length) {
    throw new BhavcopyParseError(
      `This does not look like a bhavcopy file. Missing columns: ${missing.slice(0, 4).join(', ')}` +
        `${missing.length > 4 ? ` and ${missing.length - 4} more` : ''}. ` +
        'Use the date-wise bhavcopy file as downloaded from the exchange.',
    )
  }

  let date: string | null = null

  /** Convert data row `r` (1-based index into `table`, header is row 0). */
  const convert = (r: number): BhavRow => {
    const c = table[r]
    const line = r + 1
    if (c.length < header.length) {
      throw new BhavcopyParseError(`Row ${line} has ${c.length} columns but the header has ${header.length}.`)
    }
    const rowDate = parseTradingDate(c[idx['Date']])
    if (!rowDate) throw new BhavcopyParseError(`Row ${line}: "${c[idx['Date']]}" is not a date.`)
    if (date === null) date = rowDate
    else if (rowDate !== date) {
      throw new BhavcopyParseError('This file contains more than one trading date. Use a single-day bhavcopy.')
    }

    const expiryISO = parseExpiry(c[idx['Expiry Date']])
    if (!expiryISO) throw new BhavcopyParseError(`Row ${line}: "${c[idx['Expiry Date']]}" is not an expiry date.`)

    const ot = c[idx['Option Type']].trim().toUpperCase()
    const optionType = ot === 'CE' || ot === 'PE' ? ot : null
    const strike = parseNumber(c[idx['Strike Price']], 'Strike Price', line)
    const qty = parseQuantity(c[idx["Volume(In 000's)"]], line)

    return {
      instrument: c[idx['Instrument Name']],
      symbol: c[idx['Symbol']],
      expiry: c[idx['Expiry Date']].toUpperCase(),
      expiryISO,
      optionType,
      strike: optionType ? strike : null,
      open: parseNumber(c[idx['Open']], 'Open', line),
      high: parseNumber(c[idx['High']], 'High', line),
      low: parseNumber(c[idx['Low']], 'Low', line),
      close: requiredNumber(c[idx['Close']], 'Close', line),
      prevClose: requiredNumber(c[idx['Previous Close']], 'Previous Close', line),
      volumeLots: requiredNumber(c[idx['Volume(Lots)']], 'Volume(Lots)', line),
      volumeQty: qty.qty,
      unit: qty.unit,
      valueLacs: requiredNumber(c[idx['Value(Lacs)']], 'Value(Lacs)', line),
      oiLots: requiredNumber(c[idx['Open Interest(Lots)']], 'Open Interest(Lots)', line),
    }
  }

  const finish = (rows: BhavRow[]): ParsedBhavcopy => {
    if (!rows.length || date === null) throw new BhavcopyParseError('No data rows were found in the file.')
    return { date, rows }
  }

  return { rowCount: table.length, convert, finish }
}

/** Turn an extracted table (header row + data rows) into typed rows. */
function buildParsed(table: string[][]): ParsedBhavcopy {
  const b = rowBuilder(table)
  const rows: BhavRow[] = []
  for (let r = 1; r < b.rowCount; r++) rows.push(b.convert(r))
  return b.finish(rows)
}

function checkNotEmpty(text: string) {
  if (!text || !text.trim()) throw new BhavcopyParseError('The file is empty.')
}

/**
 * Parse synchronously. Fine for tests and small files; a full-size day's file (~15 MB) takes a
 * noticeable fraction of a second in a browser, so the UI uses parseBhavcopyAsync instead.
 * @throws BhavcopyParseError with a message that is safe to show to the visitor.
 */
export function parseBhavcopy(text: string): ParsedBhavcopy {
  checkNotEmpty(text)
  if (!isHtmlText(text)) return buildParsed(csvRows(text))
  const fast = [...htmlRows(text)]
  return buildParsed(fast.length ? fast : tableRowsRegex(text))
}

/** Hand control back to the browser so it can paint and handle input; not throttled in background tabs. */
function yieldToMain(): Promise<void> {
  if (typeof MessageChannel === 'undefined') return new Promise(r => setTimeout(r, 0))
  return new Promise(resolve => {
    const ch = new MessageChannel()
    ch.port1.onmessage = () => { ch.port1.close(); resolve() }
    ch.port2.postMessage(0)
  })
}

const ROWS_PER_CHUNK = 2000

/**
 * Same result as parseBhavcopy, but yields to the event loop every couple of thousand rows so a
 * large file never freezes the page.
 * @throws BhavcopyParseError with a message that is safe to show to the visitor.
 */
export async function parseBhavcopyAsync(text: string): Promise<ParsedBhavcopy> {
  checkNotEmpty(text)
  await yieldToMain() // lets a "Reading file…" message paint first

  let table: string[][]
  if (isHtmlText(text)) {
    table = []
    for (const row of htmlRows(text)) {
      table.push(row)
      if (table.length % ROWS_PER_CHUNK === 0) await yieldToMain()
    }
    if (!table.length) table = tableRowsRegex(text)
  } else {
    table = csvRows(text)
  }

  const b = rowBuilder(table)
  const rows: BhavRow[] = []
  for (let r = 1; r < b.rowCount; r++) {
    rows.push(b.convert(r))
    if (r % ROWS_PER_CHUNK === 0) await yieldToMain()
  }
  return b.finish(rows)
}

/** Reject files that are recognisably not text tables, so the visitor gets a useful message. */
export function sniffBinaryKind(bytes: Uint8Array): string | null {
  const b = (i: number) => bytes[i] ?? 0
  if (b(0) === 0x50 && b(1) === 0x4b) return 'This is a .xlsx workbook. Use the .xls file exactly as MCX provides it, or save the sheet as CSV first.'
  if (b(0) === 0xd0 && b(1) === 0xcf && b(2) === 0x11 && b(3) === 0xe0) return 'This is a binary Excel file. Save it as CSV first, or use the .xls file exactly as MCX provides it.'
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return 'This is a PDF. Please use the data file (.xls or .csv), not the PDF.'
  return null
}
