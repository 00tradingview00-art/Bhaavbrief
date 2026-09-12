import type { Metadata } from 'next'
import DailyBriefHome from '@/components/home/DailyBriefHome'
import { getAllBriefs } from '@/lib/briefs'
import { isTodaysBriefDelayed } from '@/lib/tradingCalendar'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'
import { getActiveArcs } from '@/lib/arcs'
import { getNextHighImpactEvent } from '@/lib/eventMap'

// This route is an internal mobile rendering target. middleware.ts rewrites
// phone visits to / here while the browser URL and canonical identity remain /.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'BhaavBrief — Daily MCX Market Brief, Event Calendar & Commodity Intelligence',
  description: 'Daily MCX intelligence for Indian commodity markets: prices, context and the events that matter.',
  alternates: { canonical: 'https://bhaavbrief.in' },
  robots: { index: true, follow: true },
}

export default async function MobileHomePage() {
  const briefs = await getAllBriefs()
  const snapshot = loadSnapshot()
  const prices = snapshot ? snapshotToPriceData(snapshot) : null
  const [latest] = briefs

  return (
    <DailyBriefHome
      latest={latest}
      prices={prices}
      nextEvent={getNextHighImpactEvent()}
      briefDelayed={isTodaysBriefDelayed(latest?.date)}
      activeArc={getActiveArcs()[0]}
    />
  )
}
