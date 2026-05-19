import fs   from 'fs'
import path from 'path'
import matter from 'gray-matter'

const FLASH_DIR = path.join(process.cwd(), 'content/flash')

export interface FlashMeta {
  slug:      string
  title:     string
  date:      string
  source:    string
  category:  'energy' | 'metals' | 'forex' | 'macro'
  published: boolean
}

export interface Flash extends FlashMeta {
  content: string
}

export function getAllFlash(): FlashMeta[] {
  if (!fs.existsSync(FLASH_DIR)) return []

  const files = fs.readdirSync(FLASH_DIR)
    .filter(f => (f.endsWith('.mdx') || f.endsWith('.md')) && f !== '.gitkeep')

  return files
    .map(filename => {
      const slug = filename.replace(/\.(mdx|md)$/, '')
      const raw  = fs.readFileSync(path.join(FLASH_DIR, filename), 'utf8')
      const { data } = matter(raw)
      return {
        slug,
        title:     data.title     || 'Untitled',
        date:      data.date      || '',
        source:    data.source    || '',
        category:  (data.category as FlashMeta['category']) || 'macro',
        published: data.published !== false,
      }
    })
    .filter(f => f.published && f.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 50)
}

export function getFlash(slug: string): Flash | null {
  const mdxPath = path.join(FLASH_DIR, `${slug}.mdx`)
  const mdPath  = path.join(FLASH_DIR, `${slug}.md`)
  const target  = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null
  if (!target) return null

  const raw = fs.readFileSync(target, 'utf8')
  const { data, content } = matter(raw)

  return {
    slug,
    title:     data.title     || 'Untitled',
    date:      data.date      || '',
    source:    data.source    || '',
    category:  (data.category as FlashMeta['category']) || 'macro',
    published: data.published !== false,
    content,
  }
}
