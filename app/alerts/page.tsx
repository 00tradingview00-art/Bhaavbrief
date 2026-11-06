import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import AlertsCenter from '@/components/alerts/AlertsCenter'
import { getUpcomingEvents } from '@/lib/eventMap'
import { getWatchedEventIds } from '@/lib/alertSubscriptions'

export const metadata: Metadata = {
  title: 'Market Event Alerts',
  description: 'Get notified before the upcoming macro and commodity-market events you choose to watch.',
  alternates: { canonical: 'https://bhaavbrief.in/alerts' },
}

// Middleware protects this route (redirects to sign-in) — a real account
// email is required to notify, per lib/alertSubscriptions.ts.
export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const { userId } = await auth()
  const events = getUpcomingEvents(24 * 14).slice(0, 8).map(event => ({
    id: event.id,
    name: event.name,
    time: new Date(event.next_release_utc).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short',
    }) + ' · ' + new Date(event.next_release_utc).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
    }) + ' IST',
    impact: event.impact_tier,
    commodities: event.affected_contracts,
  }))

  const initialWatched = userId ? await getWatchedEventIds(userId) : []

  return <AlertsCenter events={events} initialWatched={initialWatched} />
}
