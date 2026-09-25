import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const ARTICLES_DIR = path.join(process.cwd(), 'content/articles')

export interface ArticleMeta {
  slug: string
  title: string
  description: string
  date: string
  time: string
  commodity: string
  tags: string[]
  priceAtPublish: number
  edition: string
  displayDate: string
}

export async function getAllArticles(): Promise<ArticleMeta[]> {
  if (!fs.existsSync(ARTICLES_DIR)) return []

  const files = fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .sort((a, b) => b.localeCompare(a)) // newest first (date in filename)

  return files.map(file => {
    const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8')
      .replace(/^```(?:mdx|md)?\n/, '').replace(/\n```\s*$/, '\n')
    const { data } = matter(raw)
    const slug = file.replace(/\.(mdx|md)$/, '')

    return {
      slug,
      title:          (data.title ?? 'Market Update').replace(/^\[HAWK-SCAN\]\s*/i, ''),
      description:    data.description  ?? '',
      date:           data.date         ?? '',
      // The LLM that writes article frontmatter sometimes echoes the "...IST"
      // suffix from its own prompt into this field verbatim (instead of the
      // bare time). Every render site appends " IST" itself, so an
      // un-stripped value here produces "11:11 pm IST IST" on the page.
      // Strip defensively at the source rather than at each render site.
      time:           (data.time ?? '').replace(/(\s*ist)+$/i, '').trim(),
      commodity:      data.commodity    ?? 'macro',
      tags:           data.tags         ?? [],
      priceAtPublish: data.priceAtPublish ?? 0,
      edition:        data.edition      ?? 'flash',
      displayDate: data.date
        ? new Date(data.date).toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            timeZone: 'Asia/Kolkata',
          })
        : '',
    }
  })
}

export async function getArticleBySlug(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) return null

  const filepath = path.join(ARTICLES_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filepath)) return null

  const raw = fs.readFileSync(filepath, 'utf8')
    .replace(/^```(?:mdx|md)?\n/, '').replace(/\n```\s*$/, '\n')
  const { data, content } = matter(raw)

  return {
    slug,
    meta: {
      title:          (data.title ?? 'Market Update').replace(/^\[HAWK-SCAN\]\s*/i, ''),
      description:    data.description  ?? '',
      date:           data.date         ?? '',
      // The LLM that writes article frontmatter sometimes echoes the "...IST"
      // suffix from its own prompt into this field verbatim (instead of the
      // bare time). Every render site appends " IST" itself, so an
      // un-stripped value here produces "11:11 pm IST IST" on the page.
      // Strip defensively at the source rather than at each render site.
      time:           (data.time ?? '').replace(/(\s*ist)+$/i, '').trim(),
      commodity:      data.commodity    ?? 'macro',
      tags:           data.tags         ?? [],
      priceAtPublish: data.priceAtPublish ?? 0,
      edition:        data.edition      ?? 'flash',
    },
    content,
  }
}
