import { NextResponse } from 'next/server'
import { readFileSync }  from 'fs'
import path              from 'path'

// Re-read on every request so the latest deployed file is always served.
export const dynamic = 'force-dynamic'

export interface NewsItem {
  id:       string
  title:    string
  summary:  string
  category: string
  tagType:  string
  pubDate:  string
}

export async function GET() {
  try {
    const file  = path.join(process.cwd(), 'data/ai-news.json')
    const items = JSON.parse(readFileSync(file, 'utf8')) as NewsItem[]
    return NextResponse.json(items, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('[news/route] Failed to read ai-news.json:', err)
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'public, s-maxage=60' },
    })
  }
}
