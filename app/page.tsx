import { getAllBriefs } from '@/lib/briefs'
import { isTodaysBriefDelayed } from '@/lib/tradingCalendar'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'
import { getNextHighImpactEvent } from '@/lib/eventMap'
import { getActiveArcs } from '@/lib/arcs'
import DailyBriefHome from '@/components/home/DailyBriefHome'

// The home route is intentionally the lightest useful market surface. Detailed
// options, correlation, volatility and historical analysis live in their own
// routes; rendering them here made first mobile paint wait on unnecessary data.
export const revalidate = 60

export const metadata = {
  title: 'BhaavBrief — Daily MCX Market Brief, Event Calendar & Commodity Intelligence',
  description: 'India’s daily commodity brief: MCX prices, market context and the next events that matter for gold, silver, crude oil, natural gas and base metals.',
  alternates: { canonical: 'https://bhaavbrief.in' },
  keywords: [
    'MCX commodity intelligence India',
    'MCX daily brief India',
    'MCX gold silver crude oil brief',
    'commodity market India today',
    'MCX event calendar India',
  ],
}

export default async function HomePage() {
  const [briefs, snapshot] = await Promise.all([getAllBriefs(), loadSnapshot()])
  const latest = briefs[0]
  const prices = snapshot ? snapshotToPriceData(snapshot) : null
  const nextEvent = getNextHighImpactEvent()
  const activeArc = getActiveArcs()[0]

  return (
    <DailyBriefHome
      latest={latest}
      prices={prices}
      nextEvent={nextEvent}
      briefDelayed={isTodaysBriefDelayed(latest?.date)}
      activeArc={activeArc}
    />
  )
}
