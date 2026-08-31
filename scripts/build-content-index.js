/**
 * BhaavBrief — Content Index Builder
 * Reads all briefs + articles and writes data/content-index.json.
 * Run after publishing new content, or via GitHub Actions post-brief-generation.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { deriveCommodityLabelsFromTags } from './lib/commodity-tags.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.join(__dirname, '..')
const BRIEFS_DIR   = path.join(ROOT, 'content/briefs')
const ARTICLES_DIR = path.join(ROOT, 'content/articles')
const RESEARCH_DIR = path.join(ROOT, 'content/research')
const OUTPUT       = path.join(ROOT, 'data/content-index.json')

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
      const tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : [])
      const rawCommodities = Array.isArray(fm.commodities) ? fm.commodities : (fm.commodities ? [fm.commodities] : [])
      return {
        type:        'brief',
        slug,
        href:        `/briefs/${slug}`,
        title:       fm.title        ?? '',
        description: fm.description  ?? fm.summary ?? '',
        excerpt:     extractExcerpt(raw),
        date:        fm.date         ?? '',
        edition:     fm.edition      ?? '',
        tags,
        // generate-brief.js now writes `commodities` for new briefs, but the
        // existing corpus predates that — derive from tags (same fallback
        // lib/briefs.ts uses) instead of indexing an empty array for those.
        commodities: rawCommodities.length > 0 ? rawCommodities : deriveCommodityLabelsFromTags(tags),
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

function indexResearch() {
  if (!fs.existsSync(RESEARCH_DIR)) return []
  return fs.readdirSync(RESEARCH_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(file => {
      const raw = fs.readFileSync(path.join(RESEARCH_DIR, file), 'utf8')
      const fm  = parseFrontmatter(raw)
      if (fm.published !== 'true' && fm.published !== true) return null
      const slug = file.replace(/\.(mdx|md)$/, '')
      return {
        type:        'research',
        slug,
        href:        `/research/${slug}`,
        title:       fm.title        ?? '',
        description: fm.description  ?? '',
        excerpt:     extractExcerpt(raw).slice(0, 200),
        date:        fm.date         ?? '',
        edition:     fm.edition      ?? 'macro-research',
        tags:        Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []),
        commodity:   fm.commodity    ?? 'macro',
        commodities: Array.isArray(fm.commodities) ? fm.commodities : (fm.commodities ? [fm.commodities] : []),
        premium:     fm.premium !== 'false' && fm.premium !== false,
      }
    })
    .filter(Boolean)
    .filter(e => e.title)
}

const briefs   = indexBriefs()
const articles = indexArticles()
const research = indexResearch()
const all      = [...briefs, ...articles, ...research]
  .sort((a, b) => b.date.localeCompare(a.date))

fs.writeFileSync(OUTPUT, JSON.stringify(all, null, 2), 'utf8')
console.log(`Content index built: ${briefs.length} briefs + ${articles.length} articles + ${research.length} research = ${all.length} total`)
console.log(`  → ${OUTPUT}`)
