import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for BhaavBrief — how we collect, use, and protect your personal data.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://bhaavbrief.in/privacy' },
}

const LAST_UPDATED = '5 October 2026'

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
            fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.1em',
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
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <Section title="1. Who We Are">
          <p>
            BhaavBrief (&quot;we&quot;, &quot;us&quot;) publishes MCX commodity market intelligence at 
            <a href="https://bhaavbrief.in" style={{ color: '#C8720A' }}>bhaavbrief.in</a>, including a free daily newsletter
            and a paid Pro subscription. We are not SEBI registered. This policy explains what personal
            data we collect through this website, why, who processes it for us, and your rights under
            India&apos;s Digital Personal Data Protection (DPDP) Act, 2023.
          </p>
        </Section>

        <Section title="2. What We Collect">
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li><strong>Newsletter:</strong> your email address.</li>
            <li><strong>Account (sign-in):</strong> your email address and, if you provide it or sign in
              with a social login, your name and profile photo.</li>
            <li><strong>Pro subscription:</strong> your name, email and mobile number (required by our
              payment processor to set up the payment mandate), your plan, and subscription and payment
              status and history. We never see or store your card, UPI or bank details — those are
              entered directly with the payment processor.</li>
            <li><strong>Feedback form:</strong> whatever you choose to send, including an optional name and
              email for a reply.</li>
            <li><strong>Search:</strong> the text you type into site search.</li>
            <li><strong>Usage and device data:</strong> pages visited, clicks, approximate location
              (from IP address), browser and device type, and referral source — collected through the
              analytics tools in section 5.</li>
          </ul>
        </Section>

        <Section title="3. Why We Use It">
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li>To send the newsletter and service emails you signed up for (e.g. welcome and
              subscription emails).</li>
            <li>To create and secure your account and provide Pro features you pay for.</li>
            <li>To take payments, keep payment records, and meet legal and tax obligations.</li>
            <li>To answer search queries and feedback.</li>
            <li>To understand how the site is used, fix problems and improve it.</li>
          </ul>
          <p style={{ marginTop: '0.5rem' }}>
            We do not sell or rent your personal data, and we do not use it for third-party advertising.
          </p>
        </Section>

        <Section title="4. Who Processes It for Us">
          <p>We use these service providers, each only for the purpose listed:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.4rem' }}>
            <li><strong>Clerk</strong> — account sign-in and authentication.</li>
            <li><strong>Cashfree Payments</strong> — Pro subscription payments and mandates.</li>
            <li><strong>Brevo</strong> — newsletter and service emails.</li>
            <li><strong>Upstash</strong> — storage of subscription status and plan details.</li>
            <li><strong>Vercel</strong> — website hosting and privacy-friendly page analytics.</li>
            <li><strong>Google Analytics</strong> and <strong>PostHog</strong> — usage analytics (section 5).</li>
            <li><strong>Anthropic</strong> — processes the text of site-search queries to return results.</li>
          </ul>
          <p style={{ marginTop: '0.5rem' }}>
            Some of these providers store data outside India. They process it on our instructions and
            under their own security and privacy commitments.
          </p>
        </Section>

        <Section title="5. Cookies, Analytics and Local Storage">
          <ul style={{ paddingLeft: '1.25rem' }}>
            <li><strong>Essential cookies</strong> keep you signed in (Clerk). The site cannot provide
              accounts without them.</li>
            <li><strong>Google Analytics</strong> uses cookies to measure visits and traffic sources.</li>
            <li><strong>PostHog</strong> uses a cookie and browser storage to measure how pages are used and
              may record session replays of your visit (what is clicked and scrolled on our pages; text
              typed into form fields is masked) to help us find usability problems.</li>
            <li><strong>Vercel Analytics</strong> counts page views without cookies.</li>
            <li><strong>Browser local storage</strong> remembers small preferences on your device (for
              example, that you dismissed the newsletter pop-up, or commodities you viewed).</li>
          </ul>
          <p style={{ marginTop: '0.5rem' }}>
            You can block or delete cookies and local storage in your browser settings; the site will
            still work, except that you will be signed out.
          </p>
        </Section>

        <Section title="6. How Long We Keep It">
          <p>
            We keep account and newsletter data while your account or subscription is active, and delete
            it when you ask us to or unsubscribe, unless we must keep it longer by law — for example,
            payment and invoice records kept for the period required by Indian tax law.
          </p>
        </Section>

        <Section title="7. Your Rights">
          <p>Under the DPDP Act you can:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.4rem' }}>
            <li><strong>Unsubscribe</strong> from the newsletter at any time using the link in every email.</li>
            <li><strong>Access</strong> a summary of the personal data we hold about you.</li>
            <li><strong>Correct</strong> or <strong>erase</strong> your data, and <strong>withdraw consent</strong>.</li>
            <li><strong>Raise a grievance</strong> with us, and, if unresolved, with the Data Protection Board of India.</li>
          </ul>
          <p style={{ marginTop: '0.5rem' }}>
            Email <a href="mailto:support@bhaavbrief.in" style={{ color: '#C8720A' }}>support@bhaavbrief.in</a> to make a request.
            We respond within 30 days.
          </p>
        </Section>

        <Section title="8. Links to External Sites">
          <p>
            BhaavBrief links to external websites (MCX, news sources, broker platforms). We are not
            responsible for their privacy practices and encourage you to review their policies.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this policy. The &quot;last updated&quot; date above shows the latest version;
            we will email account holders about material changes.
          </p>
        </Section>

        <Section title="10. Contact and Grievances">
          <p>
            Privacy questions, requests and grievances: 
            <a href="mailto:support@bhaavbrief.in" style={{ color: '#C8720A' }}>support@bhaavbrief.in</a> (Grievance contact: BhaavBrief Support Team).
          </p>
        </Section>

        <div style={{
          marginTop: '3rem', padding: '1rem 1.25rem', background: '#F3F2EC',
          border: '0.5px solid #DDDDD0', fontFamily: 'var(--font-sans)',
          fontSize: 10, color: '#8A8A7A', lineHeight: 1.7,
        }}>
          BhaavBrief is for educational and informational purposes only. We are not registered with SEBI or any other regulatory authority. Nothing on this platform constitutes investment advice, a recommendation, or a solicitation to buy or sell any security or commodity. All data and analysis is sourced from publicly available information. Past patterns are not indicative of future results. Commodity and equity trading involves substantial risk of loss. Please consult a SEBI-registered investment advisor or research analyst before making any financial decisions.
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.05em',
            color: '#C8720A', textDecoration: 'none', borderBottom: '1px solid #C8720A', paddingBottom: 1,
          }}>
            ← Back to home
          </Link>
        </div>

      </div>
    </div>
  )
}
