/**
 * BhaavBrief — Content Index Builder
 * Reads all briefs + articles and writes data/content-index.json.
 * Run after publishing new content, or via GitHub Actions post-brief-generation.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.join(__dirname, '..')
const BRIEFS_DIR = path.join(ROOT, 'content/briefs')
const ARTICLES_DIR = path.join(ROOT, 'content/articles')
const OUTPUT     = path.join(ROOT, 'data/content-index.json')

function parseFrontmatter(raw) {
  const clean = raw.replace(/^```(?:mdx|md)?\n/, '').replace(/\n```\s*$/, '\n')
  const match = clean.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const fm = {}
  for (const line of match[1].split('\n')) {
    const [k, ...v] = line.split(':')
    if (!k || !v.length) continue
    const key = k.trim()
    let val = v.join(':').trim()
    // Strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1)
    // Parse arrays
    if (val.startsWith('[')) {
      try { fm[key] = JSON.parse(val.replace(/'/g, '"')) } catch { fm[key] = val }
    } else {
      fm[key] = val
    }
  }
  return fm
}

function extractExcerpt(raw, maxLen = 200) {
  const bodyStart = raw.indexOf('---', 3)
  if (bodyStart === -1) return ''
  const body = raw.slice(bodyStart + 3).trim()
  return body
    .replace(/^#+\s+.+$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

function indexBriefs() {
  if (!fs.existsSync(BRIEFS_DIR)) return []
  return fs.readdirSync(BRIEFS_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(file => {
      const raw = fs.readFileSync(path.join(BRIEFS_DIR, file), 'utf8')
      const fm  = parseFrontmatter(raw)
      const slug = file.replace(/\.(mdx|md)$/, '')
      return {
        type:        'brief',
        slug,
        href:        `/briefs/${slug}`,
        title:       fm.title        ?? '',
        description: fm.description  ?? fm.summary ?? '',
        excerpt:     extractExcerpt(raw),
        date:        fm.date         ?? '',
        edition:     fm.edition      ?? '',
        tags:        Array.isArray(fm.tags)       ? fm.tags       : (fm.tags ? [fm.tags] : []),
        commodities: Array.isArray(fm.commodities) ? fm.commodities : (fm.commodities ? [fm.commodities] : []),
        commodity:   fm.commodity    ?? '',
      }
    })
    .filter(e => e.title)
}

function indexArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) return []
  return fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(file => {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8')
      const fm  = parseFrontmatter(raw)
      const slug = file.replace(/\.(mdx|md)$/, '')
      return {
        type:        fm.edition === 'hawk-scan' ? 'hawk-scan' : 'article',
        slug,
        href:        `/articles/${slug}`,
        title:       fm.title        ?? '',
        description: fm.description  ?? '',
        excerpt:     extractExcerpt(raw),
        date:        fm.date         ?? '',
        edition:     fm.edition      ?? 'flash',
        tags:        Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []),
        commodity:   fm.commodity    ?? '',
        commodities: fm.commodity ? [fm.commodity] : [],
        priceAtPublish: parseFloat(fm.priceAtPublish ?? '0') || 0,
      }
    })
    .filter(e => e.title)
}

const briefs   = indexBriefs()
const articles = indexArticles()
const all      = [...briefs, ...articles]
  .sort((a, b) => b.date.localeCompare(a.date))

fs.writeFileSync(OUTPUT, JSON.stringify(all, null, 2), 'utf8')
console.log(`Content index built: ${briefs.length} briefs + ${articles.length} articles = ${all.length} total`)
console.log(`  → ${OUTPUT}`)
