import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | BhaavBrief',
  description: 'Privacy policy for BhaavBrief — how we collect, use, and protect your personal data.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://bhaavbrief.in/privacy' },
}

const LAST_UPDATED = 'May 21, 2026'
const CONTACT_EMAIL = 'brief@bhaavbrief.in'

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

export default function PrivacyPage() {
  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.25rem 4rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#C8720A',
          }}>
            Legal
          </span>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.6rem, 3vw, 2rem)',
            fontWeight: 800, letterSpacing: '-0.02em', marginTop: '0.4rem', marginBottom: '0.5rem',
          }}>
            Privacy Policy
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <Section title="1. Who We Are">
          <p>
            BhaavBrief is a free daily commodity intelligence newsletter for Indian traders, published at{' '}
            <a href="https://bhaavbrief.in" style={{ color: '#C8720A' }}>bhaavbrief.in</a>.
            We are not SEBI registered. This policy explains how we handle personal data collected
            through this website.
          </p>
        </Section>

        <Section title="2. What Data We Collect">
          <p>We collect only your <strong>email address</strong> when you subscribe to the BhaavBrief newsletter.</p>
          <p style={{ marginTop: '0.5rem' }}>We do not collect:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.4rem' }}>
            <li>Names (unless you voluntarily provide one)</li>
            <li>Phone numbers</li>
            <li>Payment information</li>
            <li>Browsing history or tracking cookies</li>
          </ul>
        </Section>

        <Section title="3. Why We Collect It">
          <p>
            Your email address is used solely to send you the BhaavBrief newsletter — a free weekday
            digest of MCX commodity market intelligence. We do not use it for advertising, profiling,
            or any other purpose.
          </p>
        </Section>

        <Section title="4. How We Store and Process It">
          <p>
            Email addresses are stored and processed by <strong>Brevo</strong> (formerly Sendinblue),
            a French email marketing platform. Brevo acts as our data processor and is GDPR compliant.
            Their privacy policy is available at{' '}
            <a href="https://www.brevo.com/legal/privacypolicy/" style={{ color: '#C8720A' }} target="_blank" rel="noopener noreferrer">
              brevo.com/legal/privacypolicy
            </a>.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            We do not sell, rent, share, or transfer your email address to any third party for marketing purposes.
          </p>
        </Section>

        <Section title="5. Your Rights">
          <p>You have the right to:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.4rem' }}>
            <li><strong>Unsubscribe</strong> at any time — every email contains an unsubscribe link</li>
            <li><strong>Request deletion</strong> of your data by emailing us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#C8720A' }}>{CONTACT_EMAIL}</a>
            </li>
            <li><strong>Request a copy</strong> of the data we hold about you</li>
          </ul>
          <p style={{ marginTop: '0.5rem' }}>
            We will respond to all requests within 30 days, in compliance with India's Digital Personal
            Data Protection (DPDP) Act, 2023.
          </p>
        </Section>

        <Section title="6. Analytics">
          <p>
            This website may use Vercel Analytics, a privacy-friendly analytics tool that does not
            use cookies and does not track individuals across sites. No personally identifiable
            information is collected through analytics.
          </p>
        </Section>

        <Section title="7. Links to External Sites">
          <p>
            BhaavBrief may link to external websites (MCX, news sources, broker platforms). We are not
            responsible for the privacy practices of those sites and encourage you to review their
            policies separately.
          </p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>
            We may update this policy from time to time. The "last updated" date at the top will reflect
            any changes. Continued use of the newsletter after changes constitutes acceptance of the
            updated policy.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            For any privacy-related questions or requests, email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#C8720A' }}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <div style={{
          marginTop: '3rem', padding: '1rem 1.25rem', background: '#F3F2EC',
          border: '0.5px solid #DDDDD0', fontFamily: 'var(--font-mono)',
          fontSize: 10, color: '#8A8A7A', lineHeight: 1.7,
        }}>
          BhaavBrief is for informational and educational purposes only. Nothing on this site
          constitutes investment advice. BhaavBrief is not registered with SEBI or any other
          regulatory body.
        </div>

        <div style={{ marginTop: '2rem' }}>
          <a href="/" style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.05em',
            color: '#C8720A', textDecoration: 'none', borderBottom: '1px solid #C8720A', paddingBottom: 1,
          }}>
            ← Back to home
          </a>
        </div>

      </div>
    </div>
  )
}
