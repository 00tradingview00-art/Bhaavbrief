import { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import { safeJsonLd } from '@/lib/seo'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Methodology — How BhaavBrief Sources, Generates and Gates Every Brief',
  description: 'Where BhaavBrief\'s data comes from, how each brief is generated and checked before publishing, and how "Edge of the Day" calls get resolved — in plain terms.',
  alternates: { canonical: 'https://bhaavbrief.in/methodology' },
  openGraph: {
    title: 'Methodology — How BhaavBrief Works',
    description: 'Data sources, the publish gate, and how every claim and Edge-of-the-Day call is checked before and after publication.',
    url: 'https://bhaavbrief.in/methodology',
    siteName: 'BhaavBrief',
    locale: 'en_IN',
    type: 'website',
  },
}

const METHODOLOGY_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'AboutPage',
      '@id': 'https://bhaavbrief.in/methodology',
      url: 'https://bhaavbrief.in/methodology',
      name: 'BhaavBrief Methodology',
      description: 'How BhaavBrief sources data, generates briefs, checks them before publishing, and resolves Edge-of-the-Day calls.',
      mainEntity: { '@id': 'https://bhaavbrief.in/#organization' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'Methodology' },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Where does BhaavBrief get its price data from?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'MCX and NSE prices are read from a live exchange data feed. COMEX, LME, WTI/Brent and USD/INR reference prices come from a global market data feed, which also serves as the fallback source when a live exchange feed for a given instrument is unavailable.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is BhaavBrief SEBI registered, and does it give trading advice?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. BhaavBrief is not registered with SEBI or any regulatory authority. It publishes market context and data, not personalized investment advice or buy/sell recommendations.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is a BhaavBrief edition checked before it publishes?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Every edition passes an automated two-layer publish gate: deterministic checks that every price cited matches the source snapshot, followed by a semantic consistency pass that catches internal contradictions. An edition that fails either layer is not published.',
          },
        },
      ],
    },
  ],
}

interface ClaimsFile {
  claims: unknown[]
}

function countClaims(): number {
  try {
    const file = path.join(process.cwd(), 'data/claims.json')
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as ClaimsFile
    return (parsed.claims ?? []).length
  } catch {
    return 0
  }
}

function countBriefs(): number {
  try {
    const dir = path.join(process.cwd(), 'content/briefs')
    return fs.readdirSync(dir).filter((f) => f.endsWith('.mdx')).length
  } catch {
    return 0
  }
}

const SECTIONS = [
  {
    title: 'Where the numbers come from',
    body: [
      'MCX and NSE prices — spot, futures, open interest — are read live from an exchange data feed. Global reference prices (COMEX gold and silver, LME copper, WTI and Brent crude, USD/INR) come from a separate global market data feed, which also serves as the fallback source whenever the live exchange feed for a specific MCX instrument is temporarily unavailable.',
      'Every price snapshot carries a timestamp. If a feed fails, the brief shows the last known value with an explicit "stale" marker rather than silently reusing an old number as if it were current — a brief is never allowed to present carried-forward data as live.',
      'Import-parity figures (the MCX price versus the landed-cost equivalent of the global price, converted through USD/INR) use a single conversion module shared by the Price Bridge, the publish gate, and the brief generator itself, so the same number can\'t drift between where it\'s shown and where it\'s checked.',
    ],
  },
  {
    title: 'How a brief gets written',
    body: [
      'Each weekday at market open, the day\'s price snapshot, open interest, and the relevant macro/event calendar are assembled and handed to an AI generation step that writes the narrative — never the reverse. The system does not decide what happened and then look for numbers to fit; the numbers are fixed first, and the writing has to account for them.',
      'Every statistic beyond the day\'s live prices — a historical percentage, a seasonal pattern, a prior-edition reference — must trace back to a maintained claims ledger. The model is not permitted to state a number that isn\'t either in the day\'s snapshot or in that ledger; there is no path for an invented statistic to reach a published brief.',
    ],
  },
  {
    title: 'The publish gate',
    body: [
      'Before anything goes live, every generated brief passes an automated two-layer check. The first layer is deterministic: every rupee and dollar figure in the text is matched against the source snapshot, with tolerances only for things that are legitimately approximate (support/resistance levels, intraday ranges).',
      'The second layer is a semantic consistency pass that re-reads the brief the way a careful editor would — checking that the numbers in the headline, the body, and the price-bridge table all agree with each other and with the snapshot, and that the day\'s narrative doesn\'t contradict itself.',
      'A brief that fails either layer is not published. There is no manual override that skips this step for a specific day\'s content.',
    ],
  },
  {
    title: '"Edge of the Day" and how it gets resolved',
    body: [
      'Some editions include an "Edge of the Day" — a specific, falsifiable price level to watch, stated as a level and a direction, never as a buy or sell instruction. The next trading day\'s brief checks that level against the actual close before writing anything new, and records the verdict — confirmed, rejected, or unresolved — permanently.',
      'Nothing gets quietly removed from that record. The next morning\'s brief states the verdict plainly, including the misses.',
    ],
  },
]

export default function MethodologyPage() {
  const claimsCount = countClaims()
  const briefsCount = countBriefs()

  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(METHODOLOGY_SCHEMA) }} />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.25rem 5rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>
          Methodology
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1rem' }}>
          How BhaavBrief sources, writes, and checks every brief
        </h1>
        <p style={{ fontSize: 14.5, color: '#48483A', lineHeight: 1.75, marginBottom: '2rem', maxWidth: 620, fontWeight: 300 }}>
          This page exists so the process isn&apos;t a black box. Where the data comes from, how a brief
          gets written from it, what stops a wrong or contradictory brief from publishing, and how we
          keep ourselves honest about the calls we make — all in one place.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, marginBottom: '2.5rem', background: '#DDDDD0' }}>
          {[
            { label: 'Editions published', value: `${briefsCount}+` },
            { label: 'Ledgered claims', value: claimsCount },
            { label: 'Data sources', value: 'Live exchange + global feeds' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#F3F2EC', padding: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 800, color: '#18180F' }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {SECTIONS.map((section) => (
          <section key={section.title} style={{ marginBottom: '2.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
              {section.title}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: 14, color: '#48483A', lineHeight: 1.8, fontWeight: 300 }}>
              {section.body.map((p, i) => (
                <p key={i} style={{ margin: 0 }}>{p}</p>
              ))}
            </div>
          </section>
        ))}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '2.5rem' }}>
          <a href="/about" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#C8720A', textDecoration: 'none', borderBottom: '1px solid #C8720A', paddingBottom: 1 }}>
            More about BhaavBrief →
          </a>
        </div>

        <div style={{ background: '#18180F', padding: '1.25rem 1.5rem', color: '#FAFAF6' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A', marginBottom: '0.6rem' }}>
            Important — Not SEBI registered
          </div>
          <p style={{ fontSize: 12, color: 'rgba(250,250,246,0.6)', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
            BhaavBrief is for educational and informational purposes only. We are not registered with
            SEBI or any other regulatory authority. Nothing on this page or on BhaavBrief constitutes
            investment advice, a recommendation, or a solicitation to buy or sell any security or
            commodity. Please consult a SEBI-registered investment advisor or research analyst before
            making any financial decisions.
          </p>
        </div>
      </div>
    </div>
  )
}
