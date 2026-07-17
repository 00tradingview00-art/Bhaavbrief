/**
 * scripts/lib/promptTemplate.mjs — Part 8.2: loads a versioned prompt file
 * from prompts/ and substitutes {{VAR}} placeholders. Deliberately simple
 * (no conditionals/loops) — the prompt's actual logic (claims block
 * assembly, price formatting, etc.) stays in generate-brief.js as plain JS;
 * this only handles final substitution into the versioned template text.
 */
import fs from 'node:fs'
import path from 'node:path'

/**
 * @param {string} template - raw template text with {{KEY}} placeholders
 * @param {Record<string, string|number>} vars
 * @returns {string}
 */
export function renderPromptTemplate(template, vars) {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(String(value))
  }
  const unresolved = out.match(/\{\{[A-Z_]+\}\}/g)
  if (unresolved) {
    throw new Error(`promptTemplate: unresolved placeholder(s): ${unresolved.join(', ')}`)
  }
  return out
}

/**
 * @param {string} promptsDir - absolute path to the prompts/ directory
 * @param {string} version - e.g. "brief_v1"
 * @returns {string} raw template text with the HTML-comment header stripped
 */
export function loadPromptTemplate(promptsDir, version) {
  const filePath = path.join(promptsDir, `${version}.md`)
  const raw = fs.readFileSync(filePath, 'utf8')
  // Strip the leading <!-- ... --> documentation header, if present.
  return raw.replace(/^<!--[\s\S]*?-->\n/, '')
}
