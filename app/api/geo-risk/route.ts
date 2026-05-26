import { NextResponse } from 'next/server'
import fs   from 'fs'
import path from 'path'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const revalidate = 900  // 15 min

export type RiskLevel = 'high' | 'watch' | 'stable'

export interface HotspotItem {
  key:      string
  label:    string
  risk:     RiskLevel
  lastSeen: string | null   // ISO timestamp of most recent mention, or null
}

// Fixed hotspots that always appear — risk level is derived from news data
const HOTSPOTS: Array<{
  key:      string
  label:    string
  keywords: string[]
}> = [
  { key: 'hormuz',  label: 'Hormuz',        keywords: ['hormuz', 'persian gulf', 'strait'] },
  { key: 'redsea',  label: 'Red Sea',        keywords: ['red sea', 'suez', 'houthi', 'yemen', 'bab el'] },
  { key: 'opec',    label: 'OPEC+',          keywords: ['opec', 'production cut', 'quota', 'vienna meet'] },
  { key: 'iran',    label: 'Iran',           keywords: ['iran', 'iranian', 'nuclear deal', 'tehran'] },
  { key: 'russia',  label: 'Russia/Ukraine', keywords: ['russia', 'ukraine', 'ural blend', 'nato', 'zelens'] },
]

// Words in a title/summary that indicate active escalation (→ HIGH risk)
const ESCALATORY = [
  'strike', 'attack', 'closure', 'blockade', 'seized', 'sanction', 'missile',
  'disruption', 'emergency', 'halt', 'conflict', 'war', 'explosion', 'fire',
  'shut', 'suspend', 'ban', 'escalat',
]

const NEWS_FILE = path.join(process.cwd(), 'data/ai-news.json')
const STALE_HOURS = 72  // mentions older than this → stable

function loadNews(): Array<{ title: string; summary: string; pubDate: string; category: string }> {
  try {
    return JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'))
  } catch { return [] }
}

function textOf(item: { title: string; summary: string }) {
  return `${item.title} ${item.summary}`.toLowerCase()
}

function isEscalatory(text: string): boolean {
  return ESCALATORY.some(w => text.includes(w))
}

export async function GET(): Promise<NextResponse<HotspotItem[]>> {
  const news      = loadNews()
  const cutoffMs  = Date.now() - STALE_HOURS * 3600 * 1000

  const result: HotspotItem[] = HOTSPOTS.map(({ key, label, keywords }) => {
    // Find most recent news item mentioning this hotspot
    const matches = news
      .filter(item => {
        const text = textOf(item)
        return keywords.some(kw => text.includes(kw))
      })
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

    const latest    = matches[0] ?? null
    const isRecent  = latest && new Date(latest.pubDate).getTime() > cutoffMs

    let risk: RiskLevel = 'stable'

    if (isRecent) {
      const text = textOf(latest)
      risk = isEscalatory(text) ? 'high' : 'watch'
    }

    return {
      key,
      label,
      risk,
      lastSeen: latest ? latest.pubDate : null,
    }
  })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=300' },
  })
}
