import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const BRIEFS_DIR   = path.join(ROOT, 'content/briefs')
const FLASH_DIR    = path.join(ROOT, 'content/flash')
const ARTICLES_DIR = path.join(ROOT, 'content/articles')
const OUT_FILE     = path.join(ROOT, 'data/site-stats.json')

function countMdx(dir) {
  try { return fs.readdirSync(dir).filter(f => f.endsWith('.mdx')).length } catch { return 0 }
}

const briefFiles = fs.existsSync(BRIEFS_DIR)
  ? fs.readdirSync(BRIEFS_DIR).filter(f => f.endsWith('.mdx'))
  : []

let lastBriefDate    = null
let lastBriefEdition = 0

for (const file of briefFiles) {
  const content      = fs.readFileSync(path.join(BRIEFS_DIR, file), 'utf8')
  const editionMatch = content.match(/^edition:\s*(\d+)/m)
  const dateMatch    = content.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})/m)
  if (editionMatch) {
    const edition = parseInt(editionMatch[1])
    if (edition > lastBriefEdition) {
      lastBriefEdition = edition
      lastBriefDate    = dateMatch?.[1] ?? null
    }
  }
}

const stats = {
  briefCount:       briefFiles.length,
  flashCount:       countMdx(FLASH_DIR),
  articlesCount:    countMdx(ARTICLES_DIR),
  lastBriefDate,
  lastBriefEdition,
  generatedAt:      new Date().toISOString(),
}

fs.writeFileSync(OUT_FILE, JSON.stringify(stats, null, 2), 'utf8')
console.log(`Site stats: ${stats.briefCount} briefs | ${stats.flashCount} flash | ${stats.articlesCount} articles (edition ${stats.lastBriefEdition})`)
