import Masthead from '@/components/Masthead'
import PriceTicker from '@/components/PriceTicker'
import SubscribeForm from '@/components/SubscribeForm'
import BriefCard from '@/components/BriefCard'
import { getAllBriefs } from '@/lib/briefs'

export const revalidate = 900 // revalidate every 15 mins

export default function HomePage() {
  const briefs  = getAllBriefs()
  const latest  = briefs[0]
  const others  = briefs.slice(1, 4)
  const isLive  = briefs.length > 0

  const sectionHed = (label: string, sub?: string) => (
    <div style={{
      fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 500,
      letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8A7A',
      borderTop: '2px solid #18180F', paddingTop: 8, marginBottom: '1.5rem',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span>{label}</span>
      {sub && <span style={{ fontSize: 9, color: '#8A8A7A', letterSpacing: '0.06em' }}>{sub}</span>}
    </div>
  )

  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <Masthead />
      <PriceTicker />

      {/* Hero */}
      <section style={{ maxWidth: 980, margin: '0 auto', padding: '3rem 1.5rem 2rem', borderBottom: '0.5px solid #DDDDD0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '3rem' }}>

          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A', borderLeft: '3px solid #C8720A', paddingLeft: 10, marginBottom: '1.1rem' }}>
              Morning Intelligence · MCX &amp; NCDEX
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.1rem, 4vw, 3.1rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.025em', color: '#18180F', marginBottom: '1.1rem' }}>
              The commodity brief<br />
              that tells you <em style={{ fontStyle: 'italic', color: '#C8720A' }}>why</em>,<br />
              not just what.
            </h1>
            <p style={{ fontSize: '0.975rem', color: '#48483A', lineHeight: 1.75, fontWeight: 300, maxWidth: 520, paddingLeft: '1rem', borderLeft: '0.5px solid #C8C8B8', marginBottom: '1.5rem' }}>
              Every weekday morning, BhaavBrief distils geopolitical signals, supply-demand shifts and options data into one sharp read — delivered before the MCX bell rings at 9 AM. Free, forever.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.75rem', paddingBottom: '1.5rem', borderBottom: '0.5px solid #DDDDD0' }}>
              {[
                { icon: '🚀', text: 'Just launched — be among the first' },
                { icon: '⏰', text: 'Every weekday at 7 AM IST' },
                { icon: '📲', text: 'WhatsApp alerts included' },
                { icon: '✅', text: 'Always free to start' },
              ].map(p => (
                <span key={p.text} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.04em', color: '#8A8A7A', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {p.icon} {p.text}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="#subscribe" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#C8720A', color: '#FAFAF6', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, letterSpacing: '0.04em', padding: '12px 24px', textDecoration: 'none' }}>
                ✉ Get tomorrow's brief free
              </a>
              {isLive && latest && (
                <a href={`/briefs/${latest.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#18180F', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, letterSpacing: '0.04em', padding: '12px 24px', border: '1px solid #C8C8B8', textDecoration: 'none' }}>
                  📰 Read today's edition
                </a>
              )}
            </div>
          </div>

          {/* Subscribe sidebar */}
          <aside id="subscribe" style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.5rem', alignSelf: 'start' }}>
            <SubscribeForm />
          </aside>
        </div>
      </section>

      {/* Main content */}
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '2.5rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '3rem' }}>

        <main>
          {isLive ? (
            <>
              {sectionHed('Latest brief', 'Free · Every weekday 7 AM')}
              {latest && <BriefCard brief={latest} featured />}
              {others.length > 0 && (
                <>
                  {sectionHed('Previous briefs')}
                  {others.map(b => <BriefCard key={b.slug} brief={b} />)}
                </>
              )}
              {briefs.length > 4 && (
                <div style={{ textAlign: 'center', paddingTop: '1.5rem' }}>
                  <a href="/briefs" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '0.05em', color: '#C8720A', textDecoration: 'none', borderBottom: '1px solid #C8720A', paddingBottom: 1 }}>
                    View all briefs →
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              {sectionHed('Coming this week')}
              <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A', marginBottom: '0.75rem' }}>
                  ⚡ We just launched · First brief dropping soon
                </div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  BhaavBrief is India's first daily commodity intelligence brief.
                </p>
                <p style={{ fontSize: 13, color: '#48483A', lineHeight: 1.7, fontWeight: 300 }}>
                  Our first brief drops this week — subscribe free and be among our first 100 readers.
                </p>
              </div>

              {/* What each edition covers */}
              {sectionHed("What every edition covers", "Free · 7 AM daily")}
              {[
                { tag: 'Energy', color: '#996600', bg: '#FFF7E0', bd: '#D4A830', title: 'Crude Oil Intelligence', desc: 'Hormuz signals, OPEC updates, India import dynamics, and a clear MCX price range for the session. Direction and levels, not just price.' },
                { tag: 'Metals', color: '#1E6630', bg: '#EAF5EE', bd: '#5AAA70', title: 'Gold, Silver & Copper', desc: 'DXY, FOMC signals, COMEX positioning and MCX parity — translated into a weekly range and a clear bias. Pro subscribers get IV scanner and Black-76 fair value.' },
                { tag: 'Agri',   color: '#991818', bg: '#FDF0F0', bd: '#D07070', title: 'Mandi & NCDEX Intelligence', desc: 'Monsoon progress, crop estimates, warehouse stocks and MSP updates — synthesised into a weekly agri view for traders and merchants.' },
              ].map(item => (
                <div key={item.tag} style={{ padding: '1.25rem 0', borderBottom: '0.5px solid #DDDDD0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', border: `0.5px solid ${item.bd}`, background: item.bg, color: item.color, flexShrink: 0, marginTop: 3 }}>
                      {item.tag}
                    </span>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, marginBottom: 5 }}>{item.title}</div>
                      <p style={{ fontSize: 13, color: '#48483A', lineHeight: 1.65, fontWeight: 300, margin: 0 }}>{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Features */}
          <div style={{ marginTop: '2rem' }}>
            {sectionHed('What you get', 'Always free to start')}
            {[
              { n: '01', title: 'Geopolitical signal engine',     desc: 'Iran, Russia, La Niña — every global event translated into a direct commodity price impact in plain Hindi-English. Know what it means before you open Kite.' },
              { n: '02', title: 'MCX options intelligence',        desc: 'Implied volatility percentiles, Black-76 fair value, and a four-asset opportunity matrix across crude, gold, silver and copper — refreshed every session.' },
              { n: '03', title: 'Agri & mandi supply-demand view', desc: 'Monsoon progress, crop outlook, warehouse stocks and MSP updates synthesised weekly. Built for traders and merchants timing physical purchases.' },
              { n: '04', title: 'WhatsApp price alerts',           desc: 'Real-time spike alerts straight to your WhatsApp. No app, no login. Your commodity intelligence layer exactly where you already are.' },
              { n: '05', title: 'Sunday deep analysis',            desc: 'Every Sunday: one commodity, a full macro thesis, a concrete trade setup, and what to watch in the week ahead.' },
            ].map(f => (
              <div key={f.n} style={{ display: 'flex', gap: '1.1rem', padding: '1.25rem 0', borderBottom: '0.5px solid #DDDDD0' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: '#ECEAE2', flexShrink: 0, lineHeight: 1, width: 30 }}>{f.n}</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                  <p style={{ fontSize: 12, color: '#48483A', lineHeight: 1.65, fontWeight: 300, margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Sidebar */}
        <aside style={{ borderLeft: '0.5px solid #DDDDD0', paddingLeft: '2rem' }}>

          <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.25rem', marginBottom: '1.5rem' }} id="about">
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8720A', marginBottom: '0.75rem' }}>Why we built this</div>
            <p style={{ fontSize: 12, color: '#48483A', lineHeight: 1.7, fontWeight: 300, marginBottom: '1rem' }}>
              Indian commodity traders pay ₹5L+ a year for Bloomberg or spend 2 hours piecing together intelligence from 10 sources. BhaavBrief does that work for you — free, every weekday, before the MCX bell.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', borderTop: '0.5px solid #DDDDD0', paddingTop: '1rem', flexWrap: 'wrap' }}>
              {[{ val: '₹0', lbl: 'Forever free' }, { val: '5 min', lbl: 'Daily read' }, { val: '7 AM', lbl: 'Every day' }].map(s => (
                <div key={s.lbl} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 800 }}>{s.val}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#8A8A7A', letterSpacing: '0.06em', marginTop: 2 }}>{s.lbl.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.25rem' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8720A', marginBottom: '0.5rem' }}>About BhaavBrief</div>
            <p style={{ fontSize: 12, color: '#48483A', lineHeight: 1.7, fontWeight: 300, margin: '0 0 0.75rem' }}>
              Independent commodity intelligence for Indian traders and merchants. MCX energy, metals, and NCDEX agri — through a geopolitical, supply-demand, and technical lens.
            </p>
            <p style={{ fontSize: 12, color: '#48483A', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
              Published every weekday at 7 AM IST. No corporate backing. No conflicts of interest.
            </p>
          </div>
        </aside>
      </div>

      {/* Value strip */}
      <div style={{ background: '#18180F', color: '#FAFAF6', padding: '2.5rem 1.5rem' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
          {[
            { val: '₹0',   sup: '',    lbl: 'Free forever. No credit card. No catch. Just subscribe and read.' },
            { val: '7',    sup: 'AM',  lbl: 'Delivered before market open — every Monday to Friday, without fail.' },
            { val: '5',    sup: 'min', lbl: 'Everything you need for the trading day. Nothing you don\'t.' },
          ].map(v => (
            <div key={v.val}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                {v.val}<span style={{ color: '#C8720A' }}>{v.sup}</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(250,250,246,0.55)', fontWeight: 300, lineHeight: 1.5, margin: 0 }}>{v.lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom subscribe */}
      <section style={{ maxWidth: 980, margin: '0 auto', padding: '3rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3rem', alignItems: 'center', borderTop: '0.5px solid #DDDDD0' }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8720A', borderLeft: '3px solid #C8720A', paddingLeft: 10, marginBottom: '1rem' }}>
            ✉ Join free · No credit card
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            Start your trading day with an edge.
          </h2>
          <p style={{ fontSize: 13, color: '#48483A', lineHeight: 1.7, fontWeight: 300 }}>
            BhaavBrief is India's first daily commodity intelligence brief — covering MCX crude, gold, silver and NCDEX agri markets with geopolitical signals, supply-demand analysis and options intelligence. Free, every weekday at 7 AM.
          </p>
        </div>
        <div>
          <SubscribeForm compact />
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '3px double #C8C8B8', background: '#F3F2EC' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.1rem' }}>BhaavBrief</span>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            {['About', 'Archive', 'Privacy', 'Contact'].map(l => (
              <a key={l} href="#" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.04em', color: '#8A8A7A', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.03em', color: '#8A8A7A', maxWidth: 980, margin: '0 auto', padding: '0 1.5rem 1rem' }}>
          © 2026 BhaavBrief · bhaavbrief.in · Not registered with SEBI · Content is for informational and educational purposes only and does not constitute investment advice.
        </p>
      </footer>
    </div>
  )
}
