import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const REPO     = '00tradingview00-art/Bhaavbrief'
const WORKFLOW = 'intelligence-engine.yml'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pat = process.env.GH_PAT
  if (!pat) {
    console.error('[cron/intelligence] GH_PAT not set')
    return NextResponse.json({ error: 'GH_PAT not configured' }, { status: 500 })
  }

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization:          `Bearer ${pat}`,
        Accept:                 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type':         'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  )

  if (!res.ok) {
    const body = await res.text()
    console.error('[cron/intelligence] GitHub dispatch failed:', res.status, body)
    return NextResponse.json({ error: 'dispatch failed', status: res.status }, { status: 502 })
  }

  console.log('[cron/intelligence] intelligence-engine.yml dispatched at', new Date().toISOString())
  return NextResponse.json({ ok: true, triggeredAt: new Date().toISOString() })
}
