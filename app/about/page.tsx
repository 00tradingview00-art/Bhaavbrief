import { Metadata } from 'next'
import SubscribeForm from '@/components/SubscribeForm'
import AboutSearch from '@/components/AboutSearch'
import { getAllBriefs } from '@/lib/briefs'

export const revalidate = 60

export const metadata: Metadata = {
  title: "About — MCX Commodity Intelligence, Daily at 9:30 AM",
  description: "BhaavBrief publishes daily MCX commodity briefs at 9:30 AM — gold, silver, crude, copper, natgas — with global context, open interest, and what moves each price.",
  alternates: { canonical: 'https://bhaavbrief.in/about' },
  openGraph: {
    title: "About BhaavBrief — MCX Commodity Intelligence",
    description: 'Daily OHLC context, open interest, global benchmarks, flash intelligence and live geo risk — built for MCX traders, commodity businesses, and investors.',
    url: 'https://bhaavbrief.in/about',
    siteName: 'BhaavBrief',
    locale: 'en_IN',
    type: 'website',
  },
}

const COMMODITIES = [
  { name: 'Gold',        symbol: 'Au',  desc: 'MCX spot & futures, COMEX reference, INR impact, import parity' },
  { name: 'Silver',      symbol: 'Ag',  desc: 'MCX prices, gold-silver ratio, industrial demand signals' },
  { name: 'Crude Oil',   symbol: 'WTI', desc: 'MCX crude, global WTI/Brent context, petrol/diesel price linkage' },
  { name: 'Copper',      symbol: 'Cu',  desc: 'MCX copper, LME reference, China PMI signals, economic barometer' },
  { name: 'Natural Gas', symbol: 'NG',  desc: 'MCX nat gas, EIA inventory data, seasonal demand and global context' },
]


const PRINCIPLES = [
  { title: 'Open access', body: 'No subscription fee, no paywalled content. Commodity intelligence should be accessible to everyone who needs it — futures traders, portfolio investors, jewellers, fuel dealers, agri merchants. Not just institutional desks.' },
  { title: 'Data, not noise', body: 'Every edition leads with price levels, OHLC context, and open interest — the numbers that matter whether you are trading, hedging a business, or tracking an investment.' },
  { title: 'Plain language', body: 'We write for people who need to act on information, not economists. No jargon for its own sake. If a concept needs explaining, we explain it.' },
  { title: 'Transparent about limits', body: 'We are not SEBI registered. We do not give trading calls or buy/sell recommendations. We provide context; you make the decision.' },
]

const AUDIENCES = [
  { icon: '◈', label: 'MCX Futures Traders',   desc: 'Intraday and positional. OHLC levels, OI shifts, and historical price ranges before the morning session finds direction.' },
  { icon: '◇', label: 'Commodity Businesses',  desc: 'Jewellers, fuel dealers, agri merchants. Understand cost hedging windows, import parity, and when to lock rates.' },
  { icon: '△', label: 'Portfolio Investors',   desc: 'Gold ETF and commodity MF holders. Know when and why commodity prices are moving — before you check your NAV.' },
  { icon: '○', label: 'Analysts & Students',   desc: 'Learning futures, options, and commodity economics through real MCX market context every weekday.' },
]

const ABOUT_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type':     'AboutPage',
      '@id':       'https://bhaavbrief.in/about',
      url:         'https://bhaavbrief.in/about',
      name:        'About BhaavBrief',
      description: 'BhaavBrief publishes daily MCX commodity briefs at 9:30 AM — gold, silver, crude, copper, natgas — with global context, open interest, and what moves each price.',
      mainEntity:  { '@id': 'https://bhaavbrief.in/#organization' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'About' },
      ],
    },
  ],
}

export default async function AboutPage() {
  const briefs = await getAllBriefs()
  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ABOUT_SCHEMA) }} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.25rem 4rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.25rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A' }}>
            About
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', margin: '0.4rem 0 1.25rem', maxWidth: 780 }}>
            MCX commodity intelligence, every weekday at 9:30 AM
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#48483A', lineHeight: 1.8, fontWeight: 300, maxWidth: 760 }}>
            BhaavBrief publishes a daily open brief at MCX session start — OHLC levels, open interest,
            global benchmarks, and what they mean for Indian traders. Flash articles go out through the
            day as prices move. Built for MCX traders, commodity businesses, and anyone whose P&amp;L
            is touched by gold, crude, silver, or copper.
          </p>
        </div>

        {/* Stats bar */}
        <div className="about-stats-bar" style={{ marginBottom: '2.5rem', background: '#DDDDD0', gap: 1 }}>
          {[
            { value: '9:30 AM', label: 'Daily delivery IST' },
            { value: '5',       label: 'Commodities tracked' },
            { value: `${briefs.length}+`, label: 'Editions published' },
            { value: 'Free',    label: 'No paywall, ever' },
          ].map(s => (
            <div key={s.label} style={{ background: '#F3F2EC', padding: '1.1rem 1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', fontWeight: 800, color: '#18180F', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em', marginTop: 6 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="about-grid">

          {/* ── Left column ── */}
          <div>

            {/* Three products */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
                What BhaavBrief publishes
              </h2>
              <div className="about-products-grid">
                {[
                  {
                    badge: 'Daily Brief',
                    badgeBg: '#F3F0E8', badgeColor: '#7A7668', badgeBorder: '#C8C8B8',
                    title: 'Daily open brief',
                    desc: 'Delivered at 9:30 AM IST every weekday. OHLC levels, open interest, percent change, and global reference prices — contextualised for MCX traders before the session finds direction.',
                    link: '/briefs', linkText: 'Read latest brief',
                  },
                  {
                    badge: 'Flash',
                    badgeBg: '#EEF2FF', badgeColor: '#3730A3', badgeBorder: '#818CF8',
                    title: 'Flash articles',
                    desc: 'Breaking market intelligence published as it happens. Policy decisions, OPEC+ moves, RBI actions, sharp price dislocations — context within minutes, not hours.',
                    link: '/news', linkText: 'Intelligence feed',
                  },
                  {
                    badge: 'Geo Risk',
                    badgeBg: '#FFF7E0', badgeColor: '#996600', badgeBorder: '#D4A830',
                    title: 'Geo risk monitor',
                    desc: 'Continuous monitoring of geopolitical chokepoints — Strait of Hormuz, Red Sea, Brent supply routes. ELEVATED or STABLE for each corridor, updated every 15 minutes.',
                    link: '/news', linkText: 'Live feed',
                  },
                ].map(p => (
                  <div key={p.badge} style={{ background: '#F3F2EC', border: '0.5px solid #DDDDD0', padding: '1rem 1.1rem' }}>
                    <span style={{
                      display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 10,
                      letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px',
                      border: `0.5px solid ${p.badgeBorder}`, background: p.badgeBg, color: p.badgeColor,
                      marginBottom: '0.75rem',
                    }}>
                      {p.badge}
                    </span>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: '#18180F', marginBottom: '0.5rem' }}>
                      {p.title}
                    </div>
                    <p style={{ fontSize: 12, color: '#48483A', lineHeight: 1.75, fontWeight: 300, margin: '0 0 0.85rem' }}>
                      {p.desc}
                    </p>
                    <a href={p.link} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C8720A', textDecoration: 'none', borderBottom: '1px solid #C8720A', paddingBottom: 1, letterSpacing: '0.03em' }}>
                      {p.linkText} →
                    </a>
                  </div>
                ))}
              </div>
            </section>

            {/* What we cover */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
                What we cover
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

            {/* Who reads */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
                Who reads BhaavBrief
              </h2>
              <div className="about-audience-grid">
                {AUDIENCES.map(a => (
                  <div key={a.label} style={{ padding: '1rem 1.1rem', border: '0.5px solid #DDDDD0', background: '#FAFAF6' }}>
                    <div style={{ fontSize: 20, marginBottom: '0.5rem', color: '#C8720A', lineHeight: 1 }}>{a.icon}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#18180F', marginBottom: '0.4rem' }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: '#48483A', lineHeight: 1.65, fontWeight: 300 }}>{a.desc}</div>
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
                  Each weekday morning, we pull overnight and pre-market data across MCX commodity
                  segments — prices, OHLC levels, open interest, and volume — and combine it with
                  global macro context: COMEX, LME, crude benchmarks, and the USD/INR rate.
                </p>
                <p>
                  The brief is written at market open and lands in your inbox by 9:30 AM IST, before the MCX
                  morning session heats up. One read to size up all five commodity markets, with the full
                  data context before the narrative starts.
                </p>
                <p>
                  Through the day, the Flash Intelligence feed covers breaking signals — policy decisions,
                  major price moves, or macro events that move MCX positions. The Geo Risk Radar monitors
                  geopolitical chokepoints that affect crude and energy in real time.
                </p>
              </div>
            </section>

            {/* Why I built BhaavBrief */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
                Why I built BhaavBrief
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: 14, color: '#48483A', lineHeight: 1.8, fontWeight: 300 }}>
                <p>
                  My job inside an asset management company was sales — moving NFOs, PMS, AIF, and mutual fund products to hit targets. That role didn&apos;t teach me research. What it taught me was something more useful for building this: how clients actually think, and how easily that gets used against them.
                </p>
                <p>
                  I sat through years of fund manager calls and noticed the same pattern every time: generic commentary built on twenty years of market history, repeated almost word for word regardless of what was actually happening that quarter. Products got sold because there was a target to hit, not because anyone had checked if it fit the client sitting across the table. So I started doing my own work — tracking markets, building my own frameworks, reading the actual macro drivers instead of repeating the desk&apos;s talking points. That&apos;s where the real understanding came from.
                </p>
                <p>
                  The gap I kept running into wasn&apos;t just &quot;nobody explains why gold moved today.&quot; It was bigger than that. Someone trying to understand commodities in India needs different things depending on where they&apos;re starting from — what a lot size even is, what&apos;s actually moving the market right now, how to tell a real signal from noise, and eventually, how to get exposure to it at all. Almost none of that exists in one place, built for an Indian trader instead of copy-pasted from a US market structure.
                </p>
                <p style={{ marginBottom: 0 }}>
                  That&apos;s what BhaavBrief is built to be — not a single product, but three layers stacked on top of each other:
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginTop: '1.1rem' }}>
                {[
                  {
                    label: 'Know what\'s happening',
                    body: 'A daily brief that explains what moved in MCX gold, silver, crude, copper, and natural gas, and why — not a price ticker dressed up as analysis. A live terminal tracking all nine MCX commodities alongside INR cross-rates, COMEX and NYMEX benchmarks, and a running geopolitical risk watch — Hormuz, Red Sea, OPEC+, Iran, Russia/Ukraine — because half of what moves Indian commodity prices isn\'t domestic at all.',
                  },
                  {
                    label: 'Build the capability',
                    body: 'A Learn library covering the mechanics nobody bothers to explain simply — lot sizes, margin, rollover, taxation, hedging — for someone starting from zero. Then the Option Chain, live Greeks, implied volatility, Max Pain, PCR and OI concentration for every MCX contract, so you can read positioning yourself instead of being told what a signal means.',
                  },
                  {
                    label: 'Act on it',
                    body: 'An Invest map of every actual way to get exposure to commodities from India — gold and silver ETFs, commodity mutual funds, listed mining and energy stocks, and global instruments — once you understand what you\'re looking at, not before.',
                  },
                ].map(item => (
                  <div key={item.label} style={{ paddingLeft: '1rem', borderLeft: '2px solid #C8720A' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: '#18180F', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 14, color: '#48483A', lineHeight: 1.75, fontWeight: 300 }}>{item.body}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: '#8A8A7A', marginTop: '1.5rem', fontWeight: 300 }}>
                — Prabal Kapoor, Founder
              </p>
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
                    <div style={{ fontSize: 15, color: '#48483A', lineHeight: 1.7, fontWeight: 300 }}>{p.body}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Disclaimer */}
            <div style={{ background: '#18180F', padding: '1.25rem 1.5rem', color: '#FAFAF6' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A', marginBottom: '0.6rem' }}>
                Important — Not SEBI registered
              </div>
              <p style={{ fontSize: 12, color: 'rgba(250,250,246,0.6)', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
                BhaavBrief is for educational and informational purposes only. We are not registered with
                SEBI or any other regulatory authority. Nothing on this platform constitutes investment
                advice, a recommendation, or a solicitation to buy or sell any security or commodity.
                All data and analysis is sourced from publicly available information. Past patterns are
                not indicative of future results. Commodity and equity trading involves substantial risk
                of loss. Please consult a SEBI-registered investment advisor or research analyst before
                making any financial decisions.
              </p>
            </div>
          </div>

          {/* ── Right column ── */}
          <div>

            {/* Subscribe */}
            <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <SubscribeForm location="about" />
            </div>

            {/* Product stats */}
            <div style={{ border: '0.5px solid #DDDDD0', marginBottom: '1.5rem' }}>
              {[
                { label: 'Delivery time',   value: '9:30 AM IST' },
                { label: 'Frequency',        value: 'Every weekday' },
                { label: 'Price',            value: 'No charge' },
                { label: 'Format',           value: 'Email + Web' },
                { label: 'Flash updates',    value: 'During mkt hours' },
                { label: 'Geo Risk refresh', value: 'Every 15 min' },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: i < arr.length - 1 ? '0.5px solid #DDDDD0' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#18180F', fontWeight: 500 }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Explore links */}
            <div style={{ border: '0.5px solid #DDDDD0', padding: '1rem 1.1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A7A', marginBottom: '0.75rem' }}>
                Explore
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { href: '/briefs',  label: 'Daily Briefs' },
                  { href: '/news',    label: 'Flash Intelligence' },
                  { href: '/markets', label: 'Live Prices' },
                  { href: '/learn',   label: 'Learn MCX Trading' },
                  { href: '/invest',  label: 'How to Invest' },
                ].map(l => (
                  <a key={l.href} href={l.href} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#C8720A', textDecoration: 'none', letterSpacing: '0.03em' }}>
                    {l.label} →
                  </a>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div style={{ padding: '1.25rem', border: '0.5px solid #DDDDD0' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A7A', marginBottom: '0.75rem' }}>
                Get in touch
              </div>
              <p style={{ fontSize: 15, color: '#48483A', lineHeight: 1.7, fontWeight: 300, marginBottom: '0.75rem' }}>
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
