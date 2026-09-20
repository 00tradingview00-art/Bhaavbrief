import type { Metadata } from 'next'
import Link from 'next/link'
import { safeJsonLd } from '@/lib/seo'
import BhavcopyViewer from './BhavcopyViewer'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is the MCX bhavcopy?',
    a: "The bhavcopy is the exchange's end-of-day file for one trading date. It lists every futures and options contract with its open, high, low, close, previous close, volume, value and open interest.",
  },
  {
    q: 'Where do I download the MCX bhavcopy?',
    a: "On the MCX website under Market Data, then Bhavcopy. Pick a date and view it by date or by commodity; MCX says data is available from November 2003. Load the file you download into the viewer above to analyse it.",
  },
  {
    q: 'Does the viewer upload or store my file?',
    a: 'No. The file is read inside your browser and is not sent to BhaavBrief or anyone else. Close the tab and it is gone.',
  },
  {
    q: 'Why does the file have so many rows?',
    a: 'It lists every listed contract, including option strikes that did not trade. In the files we checked, fewer than one row in ten had any volume or open interest, so the viewer hides the rest unless you ask for them.',
  },
  {
    q: 'Why are volumes in different units?',
    a: "Volume is given in lots and also in thousands of each contract's own unit, such as kilograms, barrels or mmBtu. Volumes of different commodities are not comparable, so the viewer never adds them together.",
  },
  {
    q: 'Can I see the change in open interest from this file?',
    a: 'Not from a single file: it holds one day only and has no open-interest change column. Compare the open interest of two consecutive days to see how positions moved.',
  },
]

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'MCX Bhavcopy Viewer',
      url: 'https://bhaavbrief.in/tools/mcx-bhavcopy',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (web browser)',
      description: 'Free in-browser viewer for the MCX bhavcopy file: futures, options open interest, put-call ratio and max pain by commodity. Your file is not uploaded.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      provider: { '@id': 'https://bhaavbrief.in/#organization' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://bhaavbrief.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'MCX Bhavcopy' },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ],
}

// No live data is imported here, so the hourly tier is enough (P-03).
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'MCX Bhavcopy — Download Guide & Free Viewer',
  description: 'Where to find the MCX bhavcopy, what each column means, and a free viewer that reads your downloaded file in your browser to show open interest, PCR and max pain.',
  alternates: { canonical: 'https://bhaavbrief.in/tools/mcx-bhavcopy' },
  keywords: [
    'MCX bhavcopy download today India', 'what is MCX bhavcopy', 'MCX daily bhavcopy data',
    'MCX bhavcopy options', 'MCX EOD data India', 'MCX bhavcopy viewer', 'MCX bhavcopy analysis',
  ],
}

const COLUMNS: [string, string][] = [
  ['Date', 'The trading date. A bhavcopy file covers one date.'],
  ['Instrument Name', 'FUTCOM: commodity futures. OPTFUT: options on commodity futures. FUTIDX: index futures. OPTIDX: index options.'],
  ['Symbol', 'The commodity or index code, such as GOLD, CRUDEOIL or SILVERM.'],
  ['Expiry Date', 'When the contract expires, written like 30SEP2026.'],
  ['Option Type', 'CE for a call, PE for a put. A dash for futures.'],
  ['Strike Price', 'The option strike. Zero for futures.'],
  ['Open, High, Low', "The session's prices. Contracts that did not trade have these blank."],
  ['Close', "The contract's closing price."],
  ['Previous Close', "The prior session's close."],
  ['Volume(Lots)', 'Contracts traded, in lots.'],
  ["Volume(In 000's)", "Volume in thousands of the contract's own unit (KGS, GRMS, BBL, mmBtu and so on)."],
  ['Value(Lacs)', 'Value in lakh, as reported. On option rows it can be far larger than the premium paid, so do not add option and futures values together.'],
  ['Open Interest(Lots)', 'Lots still open at the end of the day.'],
]

const h2 = { fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.5rem' } as const
const body = { fontSize: '0.9rem', color: 'var(--ink-2)', margin: 0 } as const
const link = { color: 'var(--gold)', fontWeight: 600 } as const

export default function MCXBhavCopyPage() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem clamp(1rem, 4vw, 1.5rem)', fontFamily: 'var(--font-sans)', lineHeight: 1.7 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />

      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.25rem' }}>
        MCX Bhavcopy
      </h1>
      <p style={{ fontSize: '0.9rem', color: 'var(--ink-3)', margin: '0 0 1.25rem' }}>
        Download the day&apos;s file from MCX, then drop it below to see futures, open interest, put-call ratio and max pain by commodity.
      </p>

      <BhavcopyViewer />

      <section style={{ margin: '2rem 0 1.5rem' }}>
        <h2 style={h2}>How to get the file</h2>
        <ol style={{ ...body, paddingLeft: '1.2rem' }}>
          <li>
            Open the Bhavcopy page on the{' '}
            <a href="https://www.mcxindia.com/market-data/bhavcopy" target="_blank" rel="noopener noreferrer" style={link}>MCX website</a>
            {' '}(Market Data, then Bhavcopy).
          </li>
          <li>Choose the date, and the date-wise or commodity-wise view. MCX says data is available from November 2003.</li>
          <li>Download the file and drop it into the viewer above. Files with an .xls extension work exactly as downloaded.</li>
        </ol>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={h2}>What is in the file</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead style={{ background: 'var(--surface-2)' }}>
              <tr>
                {['Column', 'Meaning'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--ink)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COLUMNS.map(([col, desc]) => (
                <tr key={col} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{col}</td>
                  <td style={{ padding: '6px 10px', color: 'var(--ink-3)' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={h2}>What you can read from one day&apos;s file</h2>
        <ul style={{ ...body, paddingLeft: '1.2rem' }}>
          <li><strong>Where open interest sits</strong>: the strikes and expiries holding the most open contracts.</li>
          <li><strong>Put-call ratio</strong>: how put open interest compares with call open interest for an expiry.</li>
          <li><strong>Max pain</strong>: the strike where option writers would pay out least, given that day&apos;s open interest.</li>
          <li><strong>Rollover</strong>: how open interest is spread across near and far expiries of a commodity.</li>
          <li><strong>What actually traded</strong>: which contracts had volume, out of the many that are listed.</li>
        </ul>
        <p style={{ ...body, marginTop: '0.5rem' }}>
          Change in open interest, and any trend, needs files from two or more days. This page describes data; it is not a recommendation to buy or sell.
        </p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={h2}>Questions</h2>
        {FAQS.map(f => (
          <div key={f.q} style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.15rem' }}>{f.q}</h3>
            <p style={body}>{f.a}</p>
          </div>
        ))}
      </section>

      <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', margin: '1.5rem 0 0' }}>
        For live numbers, see the <Link href="/options" style={link}>MCX option chain</Link>,{' '}
        <Link href="/tools/mcx-pcr" style={link}>put-call ratio</Link>,{' '}
        <Link href="/tools/mcx-max-pain" style={link}>max pain</Link> and{' '}
        <Link href="/tools/mcx-open-interest" style={link}>open interest</Link>.
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', margin: '0.5rem 0 0' }}>
        BhaavBrief is not affiliated with MCX. The viewer reads a file you provide; it does not host or republish exchange data.
      </p>
    </main>
  )
}
