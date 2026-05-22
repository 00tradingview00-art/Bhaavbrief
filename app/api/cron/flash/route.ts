import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const REPO     = '00tradingview00-art/Bhaavbrief'
const WORKFLOW = 'flash-brief.yml'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const headerAuth = req.headers.get('authorization')
  const querySecret = new URL(req.url).searchParams.get('secret')
  const valid = secret && (headerAuth === `Bearer ${secret}` || querySecret === secret)
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pat = process.env.GH_PAT
  if (!pat) {
    console.error('[cron/flash] GH_PAT not set')
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
    console.error('[cron/flash] GitHub dispatch failed:', res.status, body)
    return NextResponse.json({ error: 'dispatch failed', status: res.status }, { status: 502 })
  }

  console.log('[cron/flash] flash-brief.yml dispatched at', new Date().toISOString())
  return NextResponse.json({ ok: true, triggeredAt: new Date().toISOString() })
}
