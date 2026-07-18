/**
 * Client-side (build/request-time) parser for the brief content pipeline's
 * fixed MDX section structure — Part 12 UI-05. This performs NO changes to
 * scripts/, prompts/, or the publish gate; it only re-parses the exact same
 * `.mdx` text that MDXRemote already renders today.
 *
 * The 5 sections named in feedback-brief-structure.md (SACRED — never
 * simplified or removed) are: Dominant Theme, The Market Is Saying,
 * Historical Context, What Kills It, Who Is Affected. This parser's job is
 * to re-present that same text through visual components, never to drop or
 * shorten it.
 *
 * Fail-open contract: every published edition (content/briefs/*.mdx) is
 * expected to match the fixed 7-heading shape below (confirmed identical
 * across sampled editions 050/055/060/066). If a future edition's heading
 * wording drifts and doesn't match, `parseBriefSections` returns `null` and
 * the caller falls back to the exact legacy behavior (rendering the whole
 * `brief.content` string through MDXRemote, unchanged) — never a partially
 * broken render.
 */

export interface BriefSection {
  heading: string
  body: string
}

export interface MarketIsSayingRow {
  text: string
  commodity: string | null
  pct: number | null
}

export interface ParsedBriefSections {
  opening: string
  priceBridge: BriefSection
  priceBridgeRows: PriceBridgeRow[] | null
  macroThread: BriefSection
  dominantTheme: BriefSection
  dominantThemeTitle: string
  dominantThemeStatus: string | null
  marketIsSaying: BriefSection
  marketIsSayingRows: MarketIsSayingRow[]
  historicalContext: BriefSection
  whatKillsIt: BriefSection
  whoIsAffected: BriefSection
  edgeOfDay: string | null
  tomorrow: string | null
  whoIsAffectedRest: string
}

export interface PriceBridgeRow {
  commodity: string
  global: string
  fx: string
  mcx: string
  pct: number | null
}

const EXPECTED_HEADINGS = [
  /price bridge/i,
  /macro thread/i,
  null, // dynamic "Dominant Theme" heading — matched positionally, not by name
  /the market is saying/i,
  /historical context/i,
  /what kills it/i,
  /who is affected/i,
]

const COMMODITY_NAMES = ['Gold', 'Crude', 'Silver', 'Copper', 'Nickel', 'Zinc', 'Lead', 'Aluminium', 'Natural [Gg]as', 'Nat Gas']

// A commodity name scraped from AI-generated markdown is untrusted input as
// far as regex construction goes — escape it before interpolating into
// `new RegExp(...)` so a stray metacharacter (or the cell being bolded, e.g.
// "**Gold**") can't throw a SyntaxError and crash the whole brief page. This
// bypassed the parser's fail-open contract entirely, since it happens after
// the 7-heading structural check already passed.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitSections(content: string): { opening: string; sections: BriefSection[] } {
  const parts = content.split(/\n(?=## )/)
  const opening = parts[0].startsWith('## ') ? '' : parts[0]
  const sectionParts = parts[0].startsWith('## ') ? parts : parts.slice(1)

  const sections: BriefSection[] = sectionParts.map(part => {
    const match = part.match(/^## (.+?)\n([\s\S]*)$/)
    if (!match) return { heading: '', body: part }
    return { heading: match[1].trim(), body: match[2].trim() }
  })

  return { opening, sections }
}

function parsePriceBridgeTable(body: string, pctLookupText: string): PriceBridgeRow[] | null {
  const lines = body.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'))
  if (lines.length < 3) return null // header + separator + at least 1 row

  const rows: PriceBridgeRow[] = []
  for (const line of lines.slice(2)) {
    // Drop only the artifact leading/trailing empty cell from the row's own
    // outer pipes — exactly one strip per side (`if`, not `while`), so a
    // genuinely-empty inner cell (e.g. an MCX price legitimately blank,
    // "| Gold | $3997/oz | ₹96.29 | |") isn't ALSO swept away by a second
    // pop, which would silently drop the whole row instead of preserving it
    // with a blank field. A row missing its trailing `|` is still handled
    // correctly since there's no artifact empty string to strip on that side.
    const cells = line.split('|').map(c => c.trim())
    if (cells.length && cells[0] === '') cells.shift()
    if (cells.length && cells[cells.length - 1] === '') cells.pop()
    if (cells.length < 4) continue
    const [commodity, global, fx, mcx] = cells
    const commodityClean = commodity.replace(/\*\*/g, '')
    // The Price Bridge table itself has no % column — the signed change for
    // each commodity is mentioned in prose elsewhere (opening line / Market
    // Is Saying), so look there. Fails open to "—" (no direction) if absent.
    // Uses the bold-stripped commodity name, not the raw cell — searching
    // for the raw "**Gold**" (with literal asterisks) never matches prose
    // like "Gold is up **+0.04%**", where only the number is bolded, so a
    // bolded commodity cell would otherwise always silently fail to find
    // its own percentage. Window is intentionally tight (20 chars, not 80):
    // a wider window let an early, unrelated commodity's own mention (e.g.
    // the opening line's "...Crude ₹7690 | USDINR ₹96.29** — Gold
    // **+0.04%**") match Crude's regex before reaching Crude's own bolded %
    // later in the text — confirmed against a real edition where Crude
    // showed Gold's +0.04% instead of its actual +1.00%. The real pairings
    // in this content are always word-adjacent ("Crude **+1.00%**" /
    // "Crude's **+1.00%**").
    const pctMatch = pctLookupText.match(new RegExp(`${escapeRegExp(commodityClean)}[^\\n]{0,20}?\\*\\*([+-]?\\d+(?:\\.\\d+)?)%\\*\\*`, 'i'))
    rows.push({
      commodity: commodityClean,
      global: global.replace(/\*\*/g, ''),
      fx: fx.replace(/\*\*/g, ''),
      mcx: mcx.replace(/\*\*/g, ''),
      pct: pctMatch ? parseFloat(pctMatch[1]) : null,
    })
  }
  return rows.length > 0 ? rows : null
}

function splitIntoSentences(body: string): string[] {
  return body
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(Boolean)
}

function parseMarketIsSayingRows(body: string): MarketIsSayingRow[] {
  const sentences = splitIntoSentences(body)
  const commodityPattern = new RegExp(`\\b(${COMMODITY_NAMES.join('|')})\\b`, 'i')
  return sentences.map(text => {
    const commodityMatch = text.match(commodityPattern)
    const pctMatch = text.match(/\*\*([+-]?\d+(?:\.\d+)?)%\*\*/)
    return {
      text,
      commodity: commodityMatch ? commodityMatch[1] : null,
      pct: pctMatch ? parseFloat(pctMatch[1]) : null,
    }
  })
}

function parseWhoIsAffected(body: string): { edgeOfDay: string | null; tomorrow: string | null; rest: string } {
  const edgeMatch = body.match(/\*\*Edge of the Day:\*\*\s*([\s\S]*?)(?=\n\n\*\*Tomorrow:\*\*|\n\n---|$)/i)
  const tomorrowMatch = body.match(/\*\*Tomorrow:\*\*\s*([\s\S]*?)(?=\n\n---|$)/i)

  let rest = body
  if (edgeMatch) rest = rest.replace(edgeMatch[0], '').trim()
  if (tomorrowMatch) rest = rest.replace(tomorrowMatch[0], '').trim()

  return {
    edgeOfDay: edgeMatch ? edgeMatch[1].trim() : null,
    tomorrow: tomorrowMatch ? tomorrowMatch[1].trim() : null,
    rest,
  }
}

export function parseBriefSections(content: string): ParsedBriefSections | null {
  const { opening, sections } = splitSections(content)

  if (sections.length !== EXPECTED_HEADINGS.length) return null

  for (let i = 0; i < EXPECTED_HEADINGS.length; i++) {
    const pattern = EXPECTED_HEADINGS[i]
    if (pattern && !pattern.test(sections[i].heading)) return null
    if (!sections[i].heading) return null
  }

  const [priceBridge, macroThread, dominantTheme, marketIsSaying, historicalContext, whatKillsIt, whoIsAffected] = sections

  // Status word is the trailing run of all-caps word(s) (BUILDING,
  // STRENGTHENING, "METALS UNDER PRESSURE", "WEAKENING AT THE EDGES, NOT
  // REVERSING", ...) regardless of what separates it from the title — some
  // editions use "— WORD", others "Something: WORD" (e.g. "Peace Dividend —
  // Rupee Cushion Edition: STRENGTHENING"), and some pre-2026-07 editions
  // use multi-word statuses that can themselves contain a comma, so the
  // separator between all-caps words must allow more than one character
  // ("[\s,]*", not "?") — a single-char separator left a trailing comma
  // stuck to the title instead of being absorbed into the status.
  // A lazy title group plus a trailing all-caps-words-and-spaces run still
  // can't distinguish a genuine status suffix from a heading that
  // coincidentally ends in an unrelated acronym (e.g. "...Meets LME") —
  // accepted as a known, lower-severity edge case rather than maintaining a
  // fixed status-word vocabulary that would need updating as the content
  // pipeline's prompt evolves.
  const statusMatch = dominantTheme.heading.match(/^(.*?)[\s:—-]*((?:[A-Z]{2,}[\s,]*)+)$/)
  const dominantThemeTitle = statusMatch && statusMatch[1].trim() ? statusMatch[1].trim() : dominantTheme.heading
  const dominantThemeStatus = statusMatch && statusMatch[1].trim() ? statusMatch[2] : null

  const { edgeOfDay, tomorrow, rest } = parseWhoIsAffected(whoIsAffected.body)

  return {
    opening,
    priceBridge,
    priceBridgeRows: parsePriceBridgeTable(priceBridge.body, `${opening}\n${marketIsSaying.body}`),
    macroThread,
    dominantTheme,
    dominantThemeTitle,
    dominantThemeStatus,
    marketIsSaying,
    marketIsSayingRows: parseMarketIsSayingRows(marketIsSaying.body),
    historicalContext,
    whatKillsIt,
    whoIsAffected,
    edgeOfDay,
    tomorrow,
    whoIsAffectedRest: rest,
  }
}
