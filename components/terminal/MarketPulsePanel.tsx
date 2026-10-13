import type { CoreInstrument, TerminalInstrumentData } from '@/lib/terminalData'
import type { PriceData } from '@/lib/prices'
import type { CompositePriorSession, HistoryPoint } from '@/lib/compositeHistory'
import { compositePulse, pricingLine } from '@/lib/compositePulse'

interface Props {
  terminalData: Record<CoreInstrument, TerminalInstrumentData | null>
  prices:       PriceData | null
  // Previous session's stored composite closes, or nulls when the store is
  // empty/unreachable — see lib/compositeHistory.ts.
  history:      CompositePriorSession
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// A stored YYYY-MM-DD session key is already an IST trading date — label it
// directly rather than round-tripping it through a Date, which would shift it
// a day under the UTC-default serverless runtime.
function sessionLabel(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ''}`.trim()
}

// Day-over-day move, written as the previous close itself rather than as a
// delta. A delta here would have to carry a unit: both these metrics are
// measured in percent, so "+2.5%" is genuinely ambiguous (2.5% OF 36.2, or
// 36.2 → 38.7?) and the unit that disambiguates it, "pp"/percentage points,
// is jargon a reader shouldn't have to already know. Naming the prior level
// needs no unit at all — the reader sees 38.7% above and 36.2% here — and
// says strictly more than a delta does while the stored series is still only
// a couple of weeks long.
//
// Deliberately NOT colored up/down: a rising or falling composite iVIX is
// neither good nor bad, and the green/red used elsewhere on this page carries
// exactly that meaning. USD/INR below keeps its colors, where direction does
// have a stated consequence.
function ChangeLine({ current, prior }: {
  current: number | null
  prior:   HistoryPoint | null
}) {
  if (current === null || prior === null) return null
  // Both levels render to 1dp, so "unchanged" means they render identically —
  // never "Up from 36.2%" above a 36.2% headline.
  const delta = current - prior.value
  const direction = Math.abs(delta) < 0.05 ? 'Unchanged from' : delta > 0 ? 'Up from' : 'Down from'
  const level = `${prior.value.toFixed(1)}%`
  return (
    <div style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 11, color: 'var(--ink-3)' }}>
      {direction} {level} at the {sessionLabel(prior.date)} close
    </div>
  )
}

// Market Pulse ships numeric facts only — no "why" narrative. A composite
// iVIX regime read (Calm/Elevated/Stress) would need a real historical
// distribution to compare today's reading against; no such series exists
// here without pulling in the Redis iv-hist store used by the Pro-gated IV
// Rank feature (app/tools/mcx-iv-rank), which is itself a paid feature this
// page shouldn't give away for free. So: today's two composite levels only,
// not a regime label or a 30-day range claim.
//
// Tile 2 shows what the commodities actually moved rather than the premium
// (the gap between the two tiles) that used to sit there: a reader has no way
// to check a derived number against anything, and naming it required the unit
// "pp" — jargon this panel now avoids entirely. The gap is still stated, as a
// sentence. See lib/compositePulse.ts for why both tiles must average over
// the same instruments.
export default function MarketPulsePanel({ terminalData, prices, history }: Props) {
  const { ivix: compositeIvix, delivered, premium } = compositePulse(terminalData)
  const pricing = pricingLine(premium)

  const usdinr = prices?.usdinr ?? 0
  const usdinrPct = prices?.usdinrChangePct ?? 0
  const usdinrUp = usdinrPct >= 0

  return (
    <div className="terminal-pulse-grid" style={{
      display: 'grid', gap: 1,
      background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden',
    }}>
      <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
          MCX Composite iVIX
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
          {compositeIvix !== null ? compositeIvix.toFixed(1) + '%' : '—'}
        </div>
        <ChangeLine current={compositeIvix} prior={history.ivix} />
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          BhaavBrief&apos;s composite read on options-market volatility across MCX&apos;s core commodities
        </div>
      </div>

      <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
          What markets actually did
        </div>
        {/* Uncolored, like tile 1: a higher or lower delivered volatility is
            neither good nor bad, and green/red on this page means exactly that. */}
        <div style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
          {delivered !== null ? delivered.toFixed(1) + '%' : '—'}
        </div>
        {/* No change line here, unlike the other two tiles. This figure is built
            from daily closes ending at the PREVIOUS close (lib/options.ts's
            candle window stops at yesterday), so it doesn't move during a
            session — and the stored series is keyed by the session the cron ran
            for, which is one ahead of the closes the value actually covers. A
            "vs yesterday" line would therefore carry a date it can't support. */}
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {pricing && `${pricing} `}Our estimate of how much these commodities have really
          moved, over the last 20 trading days
        </div>
      </div>

      <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
          USD/INR
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
          {usdinr > 0 ? usdinr.toFixed(2) : '—'}
        </div>
        <div style={{ fontSize: 11, color: usdinr > 0 ? (usdinrUp ? 'var(--up)' : 'var(--down)') : 'var(--ink-3)' }}>
          {usdinr > 0 ? (
            <>
              {usdinrUp ? '+' : ''}{usdinrPct.toFixed(2)}% —{' '}
              {/* Matches components/markets/MarketsClient.tsx's exact wording for the
                  same USDINR direction, so the same fact reads identically on both pages. */}
              {usdinrUp
                ? 'a weaker rupee amplifies MCX gains from global commodity price moves today.'
                : 'a stronger rupee dampens MCX gains from global commodity price moves today.'}
            </>
          ) : 'Unavailable'}
        </div>
      </div>
    </div>
  )
}
