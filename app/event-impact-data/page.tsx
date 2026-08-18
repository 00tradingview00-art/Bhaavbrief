import { Metadata } from 'next'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import { safeJsonLd } from '@/lib/seo'

// HOURLY tier (config/revalidate.mjs) — data/claims.json is regenerated
// periodically (scripts/lib/buildClaimsLedger.mjs), not intra-day; not a
// LIVE_DATA_IMPORT_MARKERS entry, but a literal value is still required.
export const revalidate = 3600

const BASE_URL = 'https://bhaavbrief.in'

export const metadata: Metadata = {
  title: 'MCX Event-Impact Data — How Much Global Releases Actually Move Prices',
  description: 'A maintained ledger of how much MCX gold, silver, crude oil, copper and natural gas historically move after CFTC, EIA, API and Baker Hughes data releases — computed from real MCX price history, with sample size and source.',
  keywords: [
    'MCX event impact data',
    'CFTC COT report MCX silver',
    'EIA petroleum status report MCX crude',
    'how much does EIA move MCX crude oil',
    'Baker Hughes rig count MCX impact',
    'MCX historical event data',
  ],
  alternates: { canonical: `${BASE_URL}/event-impact-data` },
  openGraph: {
    title: 'MCX Event-Impact Data — How Much Global Releases Move Prices | BhaavBrief',
    description: 'How much MCX gold, silver, crude, copper and natural gas historically move after CFTC, EIA, API and Baker Hughes releases — with sample size and methodology.',
    url: `${BASE_URL}/event-impact-data`,
    siteName: 'BhaavBrief',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'MCX Event-Impact Data | BhaavBrief',
    description: 'How much recurring global data releases historically move MCX gold, silver, crude, copper and natural gas.',
    site: '@bhaavbrief',
  },
}

interface Claim {
  claim_id: string
  statement_template: string
  values: { avgAbsMovePct: number; maxAbsMovePct: number; n: number }
  sample_period: string
  source: string
  last_verified: string
}

const COMMODITY_LABELS: Record<string, string> = {
  gold: 'Gold', silver: 'Silver', crude: 'Crude Oil', copper: 'Copper',
  natgas: 'Natural Gas', zinc: 'Zinc', aluminium: 'Aluminium', lead: 'Lead', nickel: 'Nickel',
}

const EVENT_LABELS: Record<string, string> = {
  eia_natural_gas_storage: 'EIA Natural Gas Storage Report',
  eia_petroleum_status_report: 'EIA Weekly Petroleum Status Report',
  api_crude_inventories: 'API Crude Inventories',
  baker_hughes_rig_count: 'Baker Hughes US Rig Count',
  cftc_cot_report: 'CFTC Commitment of Traders (COT) Report',
}

function loadClaims(): Claim[] {
  try {
    const file = path.join(process.cwd(), 'data/claims.json')
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { claims: Claim[] }
    return parsed.claims ?? []
  } catch {
    return []
  }
}

function parseClaimId(claimId: string): { event: string; commodity: string } {
  const idx = claimId.lastIndexOf('__')
  const eventKey = claimId.slice(0, idx)
  const commodityKey = claimId.slice(idx + 2)
  return {
    event: EVENT_LABELS[eventKey] ?? eventKey,
    commodity: COMMODITY_LABELS[commodityKey] ?? commodityKey,
  }
}

export default function EventImpactDataPage() {
  const claims = loadClaims()
    .map(c => ({ ...c, ...parseClaimId(c.claim_id) }))
    .sort((a, b) => b.values.avgAbsMovePct - a.values.avgAbsMovePct)

  const commodityCount = new Set(claims.map(c => c.commodity)).size
  const lastVerified = claims.reduce((latest, c) =>
    c.last_verified > latest ? c.last_verified : latest, claims[0]?.last_verified ?? '')

  const datasetSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Dataset',
        '@id': `${BASE_URL}/event-impact-data`,
        name: 'MCX Event-Impact Data',
        description: 'Historical average and maximum absolute percentage price move in MCX commodity futures following recurring global data releases (CFTC COT, EIA, API, Baker Hughes), computed from MCX daily candle history.',
        url: `${BASE_URL}/event-impact-data`,
        creator: { '@type': 'Organization', name: 'BhaavBrief', url: BASE_URL },
        license: `${BASE_URL}/terms`,
        temporalCoverage: lastVerified ? lastVerified.slice(0, 10) : undefined,
        variableMeasured: ['Average absolute % move', 'Maximum absolute % move', 'Sample size'],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Event-Impact Data' },
        ],
      },
    ],
  }

  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(datasetSchema) }} />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.25rem 5rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>
          Data
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1rem' }}>
          MCX Event-Impact Data
        </h1>
        <p style={{ fontSize: 14.5, color: '#48483A', lineHeight: 1.75, marginBottom: '2rem', maxWidth: 620, fontWeight: 300 }}>
          A maintained ledger of how much MCX gold, silver, crude oil, copper and natural gas have
          historically moved in the session following recurring global data releases — CFTC
          positioning reports, EIA and API inventory data, Baker Hughes rig counts. Computed directly
          from MCX daily candle history, not estimated. Every figure below carries its sample size and
          last-verified date, and every claim BhaavBrief publishes in its daily brief is checked against
          this same ledger before publication (see <Link href="/methodology" style={{ color: '#C8720A' }}>Methodology</Link>).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, marginBottom: '2.5rem', background: '#DDDDD0' }}>
          {[
            { label: 'Tracked event×commodity pairs', value: claims.length },
            { label: 'Commodities covered', value: commodityCount },
            { label: 'Source', value: 'MCX daily candles' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#F3F2EC', padding: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 800, color: '#18180F' }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <section style={{ marginBottom: '2.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
            Full ledger — sorted by average impact
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #DDDDD0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#48483A' }}>Event</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#48483A' }}>Commodity</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#48483A' }}>Avg move</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#48483A' }}>Max move</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#48483A' }}>Sample</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(c => (
                  <tr key={c.claim_id} style={{ borderBottom: '0.5px solid #E8E8DE' }}>
                    <td style={{ padding: '8px 10px', color: '#18180F' }}>{c.event}</td>
                    <td style={{ padding: '8px 10px', color: '#48483A' }}>{c.commodity}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#18180F', fontWeight: 600 }}>{c.values.avgAbsMovePct}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#8A8A7A' }}>{c.values.maxAbsMovePct}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#8A8A7A' }}>{c.values.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginBottom: '2.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
            Methodology
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: 14, color: '#48483A', lineHeight: 1.8, fontWeight: 300 }}>
            <p style={{ margin: 0 }}>
              Each figure is the average and maximum absolute percentage move in the named MCX commodity
              future, from the prior trading session&apos;s close to the reaction-day close, following the
              last N occurrences of the named event — computed from MCX Kite historical daily candles via
              a fixed script (not manually curated).
            </p>
            <p style={{ margin: 0 }}>
              &quot;Historically moved by an average of X%&quot; does not mean the next occurrence will move
              the same amount — it is a backward-looking sample statistic, not a forecast. Sample sizes
              (the last 24 occurrences of each event, at time of last verification) are shown so the
              statistic can be weighed accordingly.
            </p>
            <p style={{ margin: 0 }}>
              This ledger is the same one BhaavBrief&apos;s daily brief generator is restricted to — a
              historical statistic can only appear in a published brief if it matches an entry here; see{' '}
              <Link href="/methodology" style={{ color: '#C8720A' }}>Methodology</Link> for the full publish-gate
              process.
            </p>
          </div>
        </section>

        <div style={{ background: '#18180F', padding: '1.25rem 1.5rem', color: '#FAFAF6' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A', marginBottom: '0.6rem' }}>
            Important — Not SEBI registered
          </div>
          <p style={{ fontSize: 12, color: 'rgba(250,250,246,0.6)', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
            BhaavBrief is for educational and informational purposes only. We are not registered with
            SEBI or any other regulatory authority. This data is historical and backward-looking — it is
            not a prediction, forecast, or trading recommendation.
          </p>
        </div>
      </div>
    </div>
  )
}
