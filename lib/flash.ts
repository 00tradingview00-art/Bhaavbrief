import fs   from 'fs'
import path from 'path'
import matter from 'gray-matter'

const FLASH_DIR = path.join(process.cwd(), 'content/flash')

export interface FlashMeta {
  slug:        string
  title:       string
  date:        string
  source:      string
  category:    'energy' | 'metals' | 'forex' | 'macro' | 'geopolitical'
  published:   boolean
  excerpt:     string
  coverImage?: string
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
      const { data, content } = matter(raw)
      const plain = content
        .replace(/^#+\s.*$/gm, '')
        .replace(/\*+/g, '')
        .replace(/^(WHAT HAPPENED|WHAT IT MEANS|WHO IS AFFECTED|BOTTOM LINE|WHAT TO WATCH|MCX IMPACT|CONTEXT|WHY IT MATTERS|WATCH)[:\s]*/gim, '')
        .replace(/\n+/g, ' ')
        .trim()
      const excerpt = plain.length > 220 ? plain.slice(0, plain.lastIndexOf(' ', 220)) + '…' : plain
      return {
        slug,
        title:       data.title     || 'Untitled',
        date:        data.date      || '',
        source:      data.source    || '',
        category:    (data.category as FlashMeta['category']) || 'macro',
        published:   data.published !== false,
        excerpt,
        coverImage:  data.coverImage || undefined,
      }
    })
    .filter(f => f.published && f.date)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getAdjacentFlash(slug: string): { prev: FlashMeta | null; next: FlashMeta | null } {
  const all = getAllFlash() // newest first
  const idx = all.findIndex(f => f.slug === slug)
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: idx > 0 ? all[idx - 1] : null,               // newer article
    next: idx < all.length - 1 ? all[idx + 1] : null,  // older article
  }
}

export function getFlash(slug: string): Flash | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null

  const mdxPath = path.join(FLASH_DIR, `${slug}.mdx`)
  const mdPath  = path.join(FLASH_DIR, `${slug}.md`)
  const target  = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null
  if (!target) return null

  const raw = fs.readFileSync(target, 'utf8')
  const { data, content } = matter(raw)
  const plain = content
    .replace(/^#+\s.*$/gm, '')
    .replace(/\*+/g, '')
    .replace(/^(WHAT HAPPENED|MCX IMPACT|CONTEXT|WHY IT MATTERS|WATCH)[:\s]*/gim, '')
    .replace(/\n+/g, ' ')
    .trim()
  const excerpt = plain.length > 220 ? plain.slice(0, plain.lastIndexOf(' ', 220)) + '…' : plain

  return {
    slug,
    title:       data.title     || 'Untitled',
    date:        data.date      || '',
    source:      data.source    || '',
    category:    (data.category as FlashMeta['category']) || 'macro',
    published:   data.published !== false,
    excerpt,
    coverImage:  data.coverImage || undefined,
    content,
  }
}
