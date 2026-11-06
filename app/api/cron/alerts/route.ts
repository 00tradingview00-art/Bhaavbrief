import { NextResponse } from 'next/server'
import { getUpcomingEvents } from '@/lib/eventMap'
import { getWatchers, getNotifyEmail, wasNotified, markNotified } from '@/lib/alertSubscriptions'
import { sendAlertEmail } from '@/lib/brevo'
import { formatIST } from '@/lib/formatTime'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

// How far ahead to notify. Wider than a day so a daily cron run always
// catches every event at least once even if it runs a bit early/late;
// wasNotified()/markNotified() make re-finding the same event on a later
// run a no-op rather than a duplicate email.
const NOTIFY_WINDOW_HOURS = 36

export async function GET(req: Request): Promise<NextResponse> {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[cron/alerts] Unauthorized —', process.env.CRON_SECRET ? 'bearer token mismatch' : 'CRON_SECRET not set')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const events = getUpcomingEvents(NOTIFY_WINDOW_HOURS)
  const results: Record<string, string> = {}

  for (const event of events) {
    const watchers = await getWatchers(event.id)
    if (!watchers.length) continue

    let sent = 0
    for (const userId of watchers) {
      if (await wasNotified(event.id, userId)) continue

      const email = await getNotifyEmail(userId)
      if (!email) continue

      const ok = await sendAlertEmail(email, {
        name: event.name,
        whenIST: formatIST(event.next_release_utc),
        commodities: event.affected_contracts,
      })
      if (ok) {
        await markNotified(event.id, userId)
        sent++
      }
    }
    if (sent > 0) results[event.id] = `notified ${sent}/${watchers.length} watcher(s)`
  }

  return NextResponse.json({ ok: true, checked: events.length, results })
}
