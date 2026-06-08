import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const revalidate = 3600

export interface ThesisEntry {
  date:        string   // YYYY-MM-DD
  thesis:      string   // one bold sentence
  commodity:   string   // "MCX Crude" etc.
  direction:   'bullish' | 'bearish'
  targetLevel: number   // ₹ level to watch
  reasoning:   string   // one sentence why
  editionRef?: number
}

export interface ThesisResolved extends ThesisEntry {
  outcome:     'CORRECT' | 'WRONG'
  actualClose: number
  outcomeNote: string
}

export interface ThesisData {
  current:   ThesisEntry | null
  yesterday: ThesisResolved | null
  history:   ThesisResolved[]
}

export async function GET(): Promise<NextResponse<ThesisData | { error: string }>> {
  try {
    const raw  = readFileSync(path.join(process.cwd(), 'data/thesis-tracker.json'), 'utf8')
    const data = JSON.parse(raw) as ThesisData
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
