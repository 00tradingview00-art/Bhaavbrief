import type { Metadata } from 'next'
import AlertsCenter from '@/components/alerts/AlertsCenter'
import { getUpcomingEvents } from '@/lib/eventMap'

export const metadata: Metadata = {
  title: 'Market Event Alerts',
  description: 'Save the upcoming macro and commodity-market events you want to watch.',
  alternates: { canonical: 'https://bhaavbrief.in/alerts' },
}

export const revalidate = 900

export default function AlertsPage() {
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

  return <AlertsCenter events={events} />
}
