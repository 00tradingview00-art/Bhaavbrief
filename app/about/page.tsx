import { Metadata } from 'next'
import SubscribeForm from '@/components/SubscribeForm'
import AboutSearch from '@/components/AboutSearch'

export const metadata: Metadata = {
  title: 'About BhaavBrief — Indian Commodity Intelligence',
  description: 'BhaavBrief is a free daily MCX commodity intelligence newsletter for Indian traders. Learn about our mission, what we cover, and how we work.',
  alternates: { canonical: 'https://bhaavbrief.in/about' },
  openGraph: {
    title: 'About BhaavBrief',
    description: 'Free daily MCX commodity intelligence for Indian traders — Gold, Silver, Crude Oil, Copper and Natural Gas every weekday at 9:30 AM.',
    url: 'https://bhaavbrief.in/about',
    siteName: 'BhaavBrief',
    locale: 'en_IN',
    type: 'website',
  },
}

const COMMODITIES = [
  { name: 'Gold', symbol: 'Au', desc: 'MCX spot & futures, COMEX reference, INR impact' },
  { name: 'Silver', symbol: 'Ag', desc: 'MCX prices, industrial demand signals' },
  { name: 'Crude Oil', symbol: 'WTI', desc: 'MCX crude, global WTI/Brent context' },
  { name: 'Copper', symbol: 'Cu', desc: 'MCX copper, LME reference, economic signals' },
  { name: 'Natural Gas', symbol: 'NG', desc: 'MCX nat gas, seasonal and global context' },
]

const PRINCIPLES = [
  { title: 'Free, always', body: 'BhaavBrief has no subscription fee and no paywalled content. Commodity intelligence should be accessible to every trader, not just institutional desks.' },
  { title: 'Data, not noise', body: 'Every edition leads with price levels, OHLC context, and open interest — the numbers that actually matter to MCX traders.' },
  { title: 'Plain language', body: 'We write for traders, not economists. No jargon for its own sake. If a concept needs explaining, we explain it.' },
  { title: 'Transparent about limits', body: 'We are not SEBI registered. We do not give trading calls or buy/sell recommendations. We provide context; you make the decision.' },
]

export default function AboutPage() {
  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '3rem 1.25rem 4rem' }}>

        {/* Header */}
        <div style={{ maxWidth: 680, marginBottom: '3rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A' }}>
            About
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', margin: '0.4rem 0 1.25rem' }}>
            Commodity intelligence for every Indian trader
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#48483A', lineHeight: 1.8, fontWeight: 300 }}>
            BhaavBrief is a free weekday newsletter that delivers MCX commodity market intelligence
            directly to your inbox every morning at 9:30 AM. No fluff, no calls — just the numbers,
            context, and analysis that help you trade better.
          </p>
        </div>

        <div className="about-grid">

          {/* Left column */}
          <div>

            {/* What we cover */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
                What we cover
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {COMMODITIES.map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '0.9rem 1rem', background: '#F3F2EC', border: '0.5px solid #DDDDD0' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C8720A', background: '#FFF7E0', border: '0.5px solid #D4A830', padding: '3px 8px', flexShrink: 0, marginTop: 2 }}>
                      {c.symbol}
                    </span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: '#18180F', marginBottom: 2 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#8A8A7A', lineHeight: 1.5 }}>{c.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* How it works */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
                How it works
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: 14, color: '#48483A', lineHeight: 1.8, fontWeight: 300 }}>
                <p>
                  Each weekday morning, we pull the overnight and pre-market data across MCX commodity
                  segments — prices, OHLC levels, open interest, and volume — and combine it with
                  global macro context: COMEX, LME, crude benchmarks, and the USD/INR rate.
                </p>
                <p>
                  The brief is written by 9 AM and lands in your inbox by 9:30 AM IST, before the MCX
                  morning session heats up.
                </p>
                <p>
                  The Intelligence Feed (our flash section) publishes breaking market signals through
                  the day — policy decisions, major price moves, or macro events that affect MCX positions.
                </p>
              </div>
            </section>

            {/* Universal search */}
            <AboutSearch />

            {/* Principles */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
                Our principles
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {PRINCIPLES.map(p => (
                  <div key={p.title} style={{ paddingLeft: '1rem', borderLeft: '2px solid #C8720A' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: '#18180F', marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 13, color: '#48483A', lineHeight: 1.7, fontWeight: 300 }}>{p.body}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Disclaimer */}
            <div style={{ background: '#18180F', padding: '1.25rem 1.5rem', color: '#FAFAF6' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A', marginBottom: '0.6rem' }}>
                Important — Not SEBI registered
              </div>
              <p style={{ fontSize: 12, color: 'rgba(250,250,246,0.6)', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
                BhaavBrief is for educational and informational purposes only. We are not registered with SEBI or any other regulatory authority. Nothing on this platform constitutes investment advice, a recommendation, or a solicitation to buy or sell any security or commodity. All data and analysis is sourced from publicly available information. Past patterns are not indicative of future results. Commodity and equity trading involves substantial risk of loss. Please consult a SEBI-registered investment advisor or research analyst before making any financial decisions.
              </p>
            </div>
          </div>

          {/* Right column */}
          <div>

            {/* Subscribe card */}
            <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <SubscribeForm />
            </div>

            {/* Stats */}
            <div style={{ border: '0.5px solid #DDDDD0', marginBottom: '1.5rem' }}>
              {[
                { label: 'Delivery time', value: '9:30 AM IST' },
                { label: 'Frequency',     value: 'Every weekday' },
                { label: 'Price',         value: 'No charge' },
                { label: 'Format',        value: 'Email + Web' },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: i < arr.length - 1 ? '0.5px solid #DDDDD0' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#18180F', fontWeight: 500 }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div style={{ padding: '1.25rem', border: '0.5px solid #DDDDD0' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A7A', marginBottom: '0.75rem' }}>
                Get in touch
              </div>
              <p style={{ fontSize: 13, color: '#48483A', lineHeight: 1.7, fontWeight: 300, marginBottom: '0.75rem' }}>
                Questions, feedback, or a story tip? We read every email.
              </p>
              <a href="mailto:brief@bhaavbrief.in" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#C8720A', textDecoration: 'none', borderBottom: '1px solid #C8720A', paddingBottom: 1 }}>
                brief@bhaavbrief.in
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
