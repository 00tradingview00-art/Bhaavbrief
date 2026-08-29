import type { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 3600

export const metadata: Metadata = {
  title:       'MCX Bhavcopy — BhaavBrief',
  description: 'Everything you need to know about MCX bhavcopy: what it is, how to download the daily settlement file from MCX India, and how traders use it for EOD analysis.',
  keywords:    [
    'MCX bhavcopy download today India', 'MCX bhavcopy PDF India',
    'what is MCX bhavcopy', 'MCX daily bhavcopy data',
    'MCX bhavcopy options settlement', 'MCX EOD data India',
  ],
}

export default function MCXBhavCopyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        MCX Bhavcopy — Daily Settlement Data
      </h1>
      <p style={{ fontSize: '0.85rem', opacity: 0.65, marginBottom: '1.5rem' }}>
        Your reference for finding, downloading, and using MCX end-of-day settlement files.
      </p>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>What is MCX Bhavcopy?</h2>
        <p style={{ fontSize: '0.88rem' }}>
          &ldquo;Bhavcopy&rdquo; (Hindi: भाव copy, &ldquo;price copy&rdquo;) is the official end-of-day settlement file
          published by MCX after market close (~23:30 IST). It contains the final settlement price,
          open interest, volume, and high/low for every commodity futures and options contract
          traded that session. It is the authoritative record of each day&apos;s trading activity.
        </p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>How to Download Today&apos;s MCX Bhavcopy</h2>
        <ol style={{ fontSize: '0.88rem', paddingLeft: '1.2rem' }}>
          <li>Go to <strong>mcxindia.com → Market Data → Bhavcopy</strong></li>
          <li>Select the date (today or any past trading date)</li>
          <li>Download the CSV or PDF file — no login required</li>
        </ol>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>What&apos;s in the Bhavcopy?</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                {['Column', 'Meaning'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['SYMBOL', 'Commodity name (GOLD, CRUDEOIL, SILVER, …)'],
                ['EXPIRY', 'Contract expiry date (DDMMMYYYY)'],
                ['STRIKE', 'Strike price — for options only'],
                ['OPTIONTYPE', 'CE (Call) or PE (Put) — for options'],
                ['CLOSE', 'Settlement price for the day'],
                ['OPEN_INT', 'Total open interest (lots outstanding)'],
                ['VOLUME', 'Total volume traded (lots)'],
                ['HIGH / LOW', 'Intraday price range'],
              ].map(([col, desc]) => (
                <tr key={col} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '5px 10px', fontWeight: 600, fontFamily: 'monospace' }}>{col}</td>
                  <td style={{ padding: '5px 10px', opacity: 0.8 }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>How Traders Use Bhavcopy</h2>
        <ul style={{ fontSize: '0.88rem', paddingLeft: '1.2rem' }}>
          <li><strong>OI buildup tracking</strong>: rising OI + rising price = strong trend; rising OI + falling price = short-build.</li>
          <li><strong>IV Rank calculation</strong>: bhavcopy settlement IV gives a clean historical ATM-IV series for comparing current options pricing vs the past.</li>
          <li><strong>Max Pain</strong>: aggregate settlement prices reveal which strike maximises writer profits at expiry.</li>
          <li><strong>Rollover tracking</strong>: expiry-by-expiry OI shift from near to far month shows rollover activity.</li>
        </ul>
      </section>

      <p style={{ fontSize: '0.78rem', opacity: 0.55, marginTop: '1.5rem' }}>
        See live MCX option chain with OI, IV Rank, Greeks, and Max Pain →{' '}
        <Link href="/options" style={{ color: '#1a1a1a' }}>MCX Options</Link>
      </p>
    </main>
  )
}
