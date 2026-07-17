import { NextResponse } from 'next/server'

// This is a SECOND, independent trigger for generate-brief.yml, on top of that
// workflow's own native GitHub Actions cron (30 3 * * 1-5 = 9:00 AM IST).
// vercel.json schedules this route for 0 4 * * 1-5 = 9:30 AM IST — 30 minutes
// after the native cron. Currently harmless: generate-brief.yml's own
// idempotency check ("Get next edition number" + "Nothing to commit" guard)
// makes the second dispatch a no-op if the first run already published today's
// edition. Kept as a deliberate 30-min safety-net trigger, not dead code — but
// it was undocumented and added real confusion diagnosing the 2026-07-16
// missed-brief incident (three generate-brief.yml runs that day came from a
// mix of this cron, a manual dispatch, and the native schedule, all delayed by
// GitHub's own runner queue that day). If you're investigating why
// generate-brief.yml ran more than once, check both trigger sources.
export const dynamic = 'force-dynamic'

const REPO    = '00tradingview00-art/Bhaavbrief'
const WORKFLOW = 'generate-brief.yml'

export async function GET(req: Request) {
  // Vercel Cron automatically sends: Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pat = process.env.GH_PAT
  if (!pat) {
    console.error('[cron/brief] GH_PAT env var not set')
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
    console.error('[cron/brief] GitHub dispatch failed:', res.status, body)
    return NextResponse.json({ error: 'dispatch failed', status: res.status }, { status: 502 })
  }

  console.log('[cron/brief] generate-brief.yml dispatched at', new Date().toISOString())
  return NextResponse.json({ ok: true, triggeredAt: new Date().toISOString() })
}
