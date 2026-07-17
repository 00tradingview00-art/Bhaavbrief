/**
 * scripts/lib/flashTitle.mjs — extracts the model-generated "TITLE: ..."
 * line from a flash-intelligence generation and strips it from the body.
 *
 * The prompt (scripts/fetch-flash.js) asks for a single plain line
 * `TITLE: [headline]`, but every other section header in the same prompt
 * is `**SECTION NAME**` — that formatting mismatch causes the model to
 * occasionally "correct" the TITLE line to match the surrounding style
 * instead of following the instruction literally. Observed live in 2 of
 * 276 published flashes (2026-06-19, 2026-07-17): the original regex only
 * matched the exact requested format, so on a miss it silently fell back
 * to the source article's own headline (defeating "never copy the source
 * title") AND left the literal placeholder heading un-stripped in the
 * published body — e.g. "# TITLE\n**Real headline**" rendered verbatim on
 * the live page.
 *
 * This handles three observed shapes, trying the exact requested format
 * first and falling back only if it doesn't match:
 *   1. `TITLE: headline` (the requested format)
 *   2. `# TITLE: headline` (heading-ified, colon+headline kept on one line)
 *   3. `# TITLE` on its own line, headline on the next line (optionally
 *      wrapped in **bold**)
 */

const PATTERNS = [
  { title: /^TITLE:\s*(.+)$/m, strip: /^TITLE:.*$/m },
  { title: /^#{1,3}\s*TITLE:\s*(.+)$/m, strip: /^#{1,3}\s*TITLE:.*$/m },
  {
    title: /^#{1,3}\s*TITLE\s*\n+\s*\*{0,2}(.+?)\*{0,2}\s*$/im,
    strip: /^#{1,3}\s*TITLE\s*\n+\s*\*{0,2}.+?\*{0,2}\s*$/im,
  },
]

/**
 * @param {string} rawContent - the raw model output
 * @param {string} fallbackTitle - used only if none of the known shapes match
 * @returns {{ title: string, body: string, usedFallback: boolean }}
 */
export function extractFlashTitle(rawContent, fallbackTitle) {
  for (const { title: titlePattern, strip: stripPattern } of PATTERNS) {
    const match = rawContent.match(titlePattern)
    if (match) {
      return {
        title: match[1].trim().replace(/^["']|["']$/g, ''),
        body: rawContent.replace(stripPattern, '').trim(),
        usedFallback: false,
      }
    }
  }
  return { title: fallbackTitle, body: rawContent.trim(), usedFallback: true }
}
