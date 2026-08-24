import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms of use for BhaavBrief — MCX commodity intelligence platform.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://bhaavbrief.in/terms' },
}

const LAST_UPDATED = 'May 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 700,
        marginBottom: '0.75rem', paddingBottom: '0.4rem',
        borderBottom: '0.5px solid #DDDDD0', color: '#18180F',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: '#48483A', lineHeight: 1.8, fontWeight: 300 }}>
        {children}
      </div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.25rem 4rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#C8720A',
          }}>
            Legal
          </span>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.6rem, 3vw, 2rem)',
            fontWeight: 800, letterSpacing: '-0.02em', marginTop: '0.4rem', marginBottom: '0.5rem',
          }}>
            Terms of Use
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <Section title="1. About BhaavBrief">
          <p>
            BhaavBrief (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a commodity intelligence platform published at{' '}
            <a href="https://bhaavbrief.in" style={{ color: '#C8720A' }}>bhaavbrief.in</a>. We publish
            daily MCX commodity market intelligence, intraday flash signals, and educational content
            covering Gold, Silver, Crude Oil, Copper, and Natural Gas. BhaavBrief is free to access.
          </p>
        </Section>

        <Section title="2. Not Investment Advice">
          <p>
            <strong>BhaavBrief is for educational and informational purposes only.</strong> We are not
            registered with SEBI (Securities and Exchange Board of India) or any other regulatory
            authority. Nothing on this platform — including daily briefs, flash intelligence, geo risk
            analysis, or any other content — constitutes investment advice, a trading recommendation,
            or a solicitation to buy or sell any security, commodity, or derivative instrument.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            All content is based on publicly available market data and information. Past patterns,
            historical analysis, and price commentary are not indicative of future results.
            Commodity and equity trading involves substantial risk of loss and is not suitable for
            all investors. Please consult a SEBI-registered investment advisor or research analyst
            before making any financial decisions.
          </p>
        </Section>

        <Section title="3. Accuracy of Information">
          <p>
            We strive to ensure all price data, market commentary, and analysis is accurate at the
            time of publication. However, we make no warranties — express or implied — regarding
            the completeness, accuracy, or timeliness of any content. Market data may be delayed
            or subject to errors. You use this information entirely at your own risk.
          </p>
        </Section>

        <Section title="4. Permitted Use">
          <p>
            You may read, share, and reference BhaavBrief content for personal, non-commercial use,
            provided you attribute BhaavBrief and link to the original. You may not:
          </p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.4rem' }}>
            <li>Reproduce or republish full editions or articles without written permission</li>
            <li>Use content for commercial redistribution or paid services</li>
            <li>Scrape or systematically extract content in bulk</li>
            <li>Misrepresent BhaavBrief content as your own</li>
          </ul>
        </Section>

        <Section title="5. Newsletter Subscription">
          <p>
            By subscribing to the BhaavBrief email newsletter, you consent to receiving daily
            commodity intelligence emails on weekdays. You may unsubscribe at any time via the
            unsubscribe link in any email. See our{' '}
            <a href="/privacy" style={{ color: '#C8720A' }}>Privacy Policy</a> for details on how
            we handle your data.
          </p>
        </Section>

        <Section title="6. External Links">
          <p>
            BhaavBrief may link to external websites including MCX, exchanges, broker platforms,
            and news sources. We are not responsible for the content, accuracy, or policies of
            those external sites.
          </p>
        </Section>

        <Section title="7. Limitation of Liability">
          <p>
            To the fullest extent permitted by applicable law, BhaavBrief and its operators shall
            not be liable for any direct, indirect, incidental, or consequential loss arising from
            your use of this platform or reliance on any content published here. This includes,
            without limitation, any trading losses, investment decisions, or financial harm.
          </p>
        </Section>

        <Section title="8. Changes to These Terms">
          <p>
            We may update these terms from time to time. The &quot;last updated&quot; date at the top will
            reflect any changes. Continued use of BhaavBrief after changes are posted constitutes
            acceptance of the revised terms.
          </p>
        </Section>

        <Section title="9. Governing Law">
          <p>
            These terms are governed by the laws of India. Any disputes arising from use of
            BhaavBrief shall be subject to the exclusive jurisdiction of courts in India.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            For questions about these terms, reach us via our{' '}
            <Link href="/feedback" style={{ color: '#C8720A' }}>feedback form</Link>.
          </p>
        </Section>

        <div style={{
          marginTop: '2rem', padding: '1rem 1.25rem', background: '#F3F2EC',
          border: '0.5px solid #DDDDD0',
          display: 'flex', gap: 24, flexWrap: 'wrap',
        }}>
          <Link href="/privacy" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#C8720A', textDecoration: 'none', borderBottom: '1px solid #C8720A', paddingBottom: 1 }}>
            Privacy Policy →
          </Link>
          <Link href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8A8A7A', textDecoration: 'none' }}>
            ← Back to home
          </Link>
        </div>

      </div>
    </div>
  )
}
