import { NextResponse } from 'next/server'

// Shared handler for the /api/cron/* routes that start a GitHub Actions
// workflow. GitHub's own scheduler skipped ~85% of this repo's "every 15
// minutes" runs (30 Sep 2026 review: 45 scheduled Intelligence Engine runs in
// 14 days against ~620 expected), so an external timer (cron-job.org) calls
// these routes instead, with `Authorization: Bearer <CRON_SECRET>`.

const REPO = '00tradingview00-art/Bhaavbrief'

export async function dispatchWorkflow(req: Request, workflow: string, tag: string): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pat = process.env.GH_PAT
  if (!pat) {
    console.error(`[cron/${tag}] GH_PAT not set`)
    return NextResponse.json({ error: 'GH_PAT not configured' }, { status: 500 })
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization:          `Bearer ${pat}`,
      Accept:                 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type':         'application/json',
    },
    body: JSON.stringify({ ref: 'main' }),
  })

  if (!res.ok) {
    console.error(`[cron/${tag}] GitHub dispatch failed:`, res.status, await res.text())
    return NextResponse.json({ error: 'dispatch failed', status: res.status }, { status: 502 })
  }

  const triggeredAt = new Date().toISOString()
  console.log(`[cron/${tag}] ${workflow} dispatched at`, triggeredAt)
  return NextResponse.json({ ok: true, triggeredAt })
}
