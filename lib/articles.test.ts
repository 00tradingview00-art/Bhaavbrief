import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', () => ({
  default: {
    existsSync:   vi.fn(),
    readdirSync:  vi.fn(),
    readFileSync: vi.fn(),
  },
}))

import fs from 'fs'
import { getAllArticles, getArticleBySlug } from './articles'

const mockExists   = vi.mocked(fs.existsSync)
const mockReaddir  = vi.mocked(fs.readdirSync)
const mockReadFile = vi.mocked(fs.readFileSync)

function mdx(time: string) {
  return `---
title: Test Article
date: "2026-09-24T17:41:00.000Z"
time: "${time}"
commodity: natgas
edition: flash
---
Body content.
`
}

// Reproduces the "IST IST" bug: the LLM generating article frontmatter
// (scripts/intelligence-engine.js) sometimes echoes the "...IST" suffix from
// its own prompt into the `time:` field verbatim, and every render site
// (app/commodities/[commodity]/page.tsx, app/articles/[slug]/page.tsx)
// appends " IST" itself — doubling it on the page. lib/articles.ts strips
// this defensively at the source so no render site has to know about it.
describe('article time field — IST duplication defense', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExists.mockReturnValue(true)
  })

  it('getAllArticles strips a single trailing "IST" the LLM echoed into the time field', async () => {
    mockReaddir.mockReturnValue(['2026-09-24-test.mdx'] as unknown as ReturnType<typeof fs.readdirSync>)
    mockReadFile.mockReturnValue(mdx('11:11 pm IST'))
    const [article] = await getAllArticles()
    expect(article.time).toBe('11:11 pm')
  })

  it('getAllArticles strips a doubled trailing "IST IST"', async () => {
    mockReaddir.mockReturnValue(['2026-09-24-test.mdx'] as unknown as ReturnType<typeof fs.readdirSync>)
    mockReadFile.mockReturnValue(mdx('11:11 pm IST IST'))
    const [article] = await getAllArticles()
    expect(article.time).toBe('11:11 pm')
  })

  it('getAllArticles leaves an already-clean time value untouched', async () => {
    mockReaddir.mockReturnValue(['2026-09-24-test.mdx'] as unknown as ReturnType<typeof fs.readdirSync>)
    mockReadFile.mockReturnValue(mdx('11:11 pm'))
    const [article] = await getAllArticles()
    expect(article.time).toBe('11:11 pm')
  })

  it('getArticleBySlug applies the same stripping', async () => {
    mockReadFile.mockReturnValue(mdx('9:05 am IST'))
    const result = await getArticleBySlug('2026-09-24-test')
    expect(result?.meta.time).toBe('9:05 am')
  })
})
