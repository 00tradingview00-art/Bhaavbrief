import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Design tokens
const CREAM  = '#FAFAF6'
const INK    = '#18180F'
const INK_2  = '#48483A'
const INK_4  = '#8A8A7A'
const GOLD   = '#C8720A'
const BORDER = '#E0DFD5'
const GREEN  = '#166534'
const RED    = '#991818'
const S = 2

function getFont(weight: 'regular' | 'bold'): ArrayBuffer | null {
  try {
    const file = weight === 'bold' ? 'Inter-Bold.ttf' : 'Inter-Regular.ttf'
    const buf = fs.readFileSync(path.join(process.cwd(), 'public/fonts', file))
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  } catch { return null }
}

interface PriceEntry { mcx: number | null; pct: number | null }
interface Prices {
  gold: PriceEntry; silver: PriceEntry; crude: PriceEntry
  copper: PriceEntry; natgas: PriceEntry
}

async function fetchPrices(): Promise<Prices | null> {
  try {
    const r = await fetch('https://bhaavbrief.in/api/prices', { signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    const d = await r.json()
    return {
      gold:   { mcx: d.gold?.mcx   ?? null, pct: d.goldComexPct    ?? null },
      silver: { mcx: d.silver?.mcx ?? null, pct: d.silverComexPct  ?? null },
      crude:  { mcx: d.crude?.mcx  ?? null, pct: d.crudePct        ?? null },
      copper: { mcx: d.copper?.mcx ?? null, pct: d.copperComexPct  ?? null },
      natgas: { mcx: d.natgas?.mcx ?? null, pct: d.natgasPct       ?? null },
    }
  } catch { return null }
}

function fmt(n: number, decimals = 0) {
  return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-IN')
}
function pctStr(n: number) {
  return `${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(2)}%`
}
function pctColor(n: number) { return n >= 0 ? GREEN : RED }

// ── Slide definitions for "what-moves-mcx" ────────────────────────────────────
const WHAT_MOVES = [
  null, // index 0 unused
  'cover',
  {
    name: 'MCX GOLD',
    unit: '₹ / 10g',
    priceKey: 'gold' as keyof Prices,
    drivers: [
      'COMEX Gold — US session sets the overnight reference price',
      'USD/INR rate — rupee weakening lifts MCX even without COMEX moving',
      'Safe-haven demand — geopolitics, Fed rate expectations, central bank buying',
    ],
    insight: 'Every 1% rupee fall adds ~1% to MCX Gold independent of COMEX.',
  },
  {
    name: 'MCX SILVER',
    unit: '₹ / kg',
    priceKey: 'silver' as keyof Prices,
    drivers: [
      'COMEX Silver + gold-silver ratio (currently ~69x)',
      'Solar demand — each GW of panels consumes 90-120 tonnes of silver paste',
      'India jewellery + investment absorption (~20% of global supply)',
    ],
    insight: 'Silver has a monetary price AND an industrial floor from solar expansion.',
  },
  {
    name: 'MCX CRUDE',
    unit: '₹ / barrel',
    priceKey: 'crude' as keyof Prices,
    drivers: [
      'OPEC+ output decisions — production cuts or increases shift the global balance',
      'US EIA Inventory Report — released Wednesdays 8:30 PM IST',
      'Brent crude spot (India imports Brent-linked crude, not WTI)',
    ],
    insight: 'India imports ~90% of its crude. A $5 Brent move = ₹8,000+ crore monthly cost shift.',
  },
  {
    name: 'MCX COPPER',
    unit: '₹ / kg',
    priceKey: 'copper' as keyof Prices,
    drivers: [
      'China trade data — published 10th-13th monthly; China buys 55% of world copper',
      'LME Copper (London afternoon session sets the global price)',
      'India power grid + EV infrastructure capex',
    ],
    insight: "MCX Copper's beta to LME is ~0.75 — USD/INR absorbs or amplifies the difference.",
  },
  {
    name: 'MCX NATGAS',
    unit: '₹ / mmBtu',
    priceKey: 'natgas' as keyof Prices,
    drivers: [
      'US Henry Hub futures — the global benchmark even for Indian contracts',
      'US LNG export volumes — higher exports tighten domestic US supply',
      'Monsoon season — depresses industrial demand in India Jun-Sep',
    ],
    insight: 'NatGas is MCX\'s most volatile commodity — seasonal swings of 40-60% are normal.',
  },
  'cta',
]

// ── Slide renderers ───────────────────────────────────────────────────────────

function CoverSlide() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      backgroundColor: INK, padding: `${72*S}px ${88*S}px`,
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 10*S, height: '100%', backgroundColor: GOLD, display: 'flex' }} />

      <div style={{ color: GOLD, fontSize: 21*S, fontWeight: 700, letterSpacing: 4, marginBottom: 32*S }}>
        BHAAVBRIEF
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ color: GOLD, fontSize: 15*S, fontWeight: 700, letterSpacing: 4, marginBottom: 24*S }}>
          MCX INTELLIGENCE
        </div>
        <div style={{
          color: '#FFFFFF', fontSize: 58*S, fontWeight: 700,
          lineHeight: 1.15, marginBottom: 28*S,
        }}>
          5 MCX{'\n'}Commodities{'\n'}— What Moves{'\n'}Each One
        </div>
        <div style={{ color: INK_4, fontSize: 24*S, lineHeight: 1.6 }}>
          Gold · Silver · Crude · Copper · NatGas
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: INK_4, fontSize: 18*S }}>Swipe to read each one →</div>
        <div style={{ color: GOLD, fontSize: 19*S, fontWeight: 700 }}>bhaavbrief.in</div>
      </div>
    </div>
  )
}

function CommoditySlide({
  slideNum, totalSlides, def, prices,
}: {
  slideNum: number
  totalSlides: number
  def: { name: string; unit: string; priceKey: keyof Prices; drivers: string[]; insight: string }
  prices: Prices | null
}) {
  const entry = prices?.[def.priceKey]
  const mcx   = entry?.mcx
  const pct   = entry?.pct

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      backgroundColor: CREAM, padding: `${60*S}px ${88*S}px`,
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 10*S, height: '100%', backgroundColor: GOLD, display: 'flex' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18*S }}>
        <div style={{ color: GOLD, fontSize: 19*S, fontWeight: 700, letterSpacing: 3 }}>BHAAVBRIEF</div>
        <div style={{ color: INK_4, fontSize: 16*S }}>{today}</div>
      </div>
      <div style={{ height: S, backgroundColor: BORDER, marginBottom: 36*S, display: 'flex' }} />

      {/* Commodity name + price */}
      <div style={{ marginBottom: 28*S }}>
        <div style={{ color: GOLD, fontSize: 15*S, fontWeight: 700, letterSpacing: 4, marginBottom: 10*S }}>
          {def.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16*S }}>
          <div style={{ color: INK, fontSize: 52*S, fontWeight: 700, lineHeight: 1 }}>
            {mcx != null ? `₹${fmt(mcx)}` : '—'}
          </div>
          {pct != null && (
            <div style={{ color: pctColor(pct), fontSize: 24*S, fontWeight: 600 }}>
              {pctStr(pct)}
            </div>
          )}
        </div>
        <div style={{ color: INK_4, fontSize: 16*S, marginTop: 6*S }}>{def.unit} · MCX</div>
      </div>

      <div style={{ height: S, backgroundColor: BORDER, marginBottom: 28*S, display: 'flex' }} />

      {/* Drivers */}
      <div style={{ color: INK_4, fontSize: 14*S, fontWeight: 700, letterSpacing: 3, marginBottom: 18*S }}>
        WHAT MOVES IT
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16*S, marginBottom: 28*S, flex: 1 }}>
        {def.drivers.map((d, i) => (
          <div key={i} style={{ display: 'flex', gap: 14*S }}>
            <div style={{ color: GOLD, fontSize: 18*S, fontWeight: 700, flexShrink: 0, marginTop: 2*S }}>→</div>
            <div style={{ color: INK_2, fontSize: 19*S, lineHeight: 1.55 }}>{d}</div>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div style={{
        backgroundColor: '#F0EDE6', borderLeft: `${4*S}px solid ${GOLD}`,
        padding: `${14*S}px ${18*S}px`, marginBottom: 24*S,
      }}>
        <div style={{ color: INK, fontSize: 17*S, lineHeight: 1.6, fontWeight: 600 }}>
          {def.insight}
        </div>
      </div>

      {/* Footer */}
      <div style={{ height: S, backgroundColor: BORDER, marginBottom: 18*S, display: 'flex' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: GOLD, fontSize: 17*S, fontWeight: 700 }}>bhaavbrief.in</div>
        <div style={{ color: INK_4, fontSize: 16*S }}>{slideNum} / {totalSlides}</div>
      </div>
    </div>
  )
}

function CTASlide() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      backgroundColor: INK, padding: `${72*S}px ${88*S}px`,
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 10*S, height: '100%', backgroundColor: GOLD, display: 'flex' }} />

      <div style={{ color: GOLD, fontSize: 21*S, fontWeight: 700, letterSpacing: 4, marginBottom: 32*S }}>
        BHAAVBRIEF
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ color: GOLD, fontSize: 15*S, fontWeight: 700, letterSpacing: 4, marginBottom: 24*S }}>
          EVERY WEEKDAY
        </div>
        <div style={{
          color: '#FFFFFF', fontSize: 48*S, fontWeight: 700,
          lineHeight: 1.2, marginBottom: 32*S,
        }}>
          We track all 5 at 9:30 AM, every morning — before MCX opens.
        </div>
        <div style={{ color: INK_4, fontSize: 22*S, lineHeight: 1.6, marginBottom: 48*S }}>
          Gold · Silver · Crude · Copper · NatGas{'\n'}Live prices · Global context · What it means
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: GOLD, borderRadius: 6*S, padding: `${16*S}px ${32*S}px`,
          alignSelf: 'flex-start',
        }}>
          <div style={{ color: '#FFFFFF', fontSize: 22*S, fontWeight: 700 }}>bhaavbrief.in — Free daily brief</div>
        </div>
      </div>

      <div style={{ color: INK_4, fontSize: 16*S }}>Follow @bhaavbrief for daily MCX intelligence</div>
    </div>
  )
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ topic: string; slide: string }> }
) {
  const { topic, slide } = await params
  const slideNum = parseInt(slide, 10)

  if (topic !== 'what-moves-mcx' || isNaN(slideNum) || slideNum < 1 || slideNum > 7) {
    return new Response('Not found', { status: 404 })
  }

  const [interRegular, interBold] = [getFont('regular'), getFont('bold')]
  const fontConfig = [
    ...(interRegular ? [{ name: 'Inter', data: interRegular, weight: 400 as const, style: 'normal' as const }] : []),
    ...(interBold    ? [{ name: 'Inter', data: interBold,    weight: 700 as const, style: 'normal' as const }] : []),
  ]

  const totalSlides = 7
  const size = { width: 1080 * S, height: 1080 * S }

  if (slideNum === 1) {
    return new ImageResponse(<CoverSlide />, { ...size, fonts: fontConfig })
  }

  if (slideNum === totalSlides) {
    return new ImageResponse(<CTASlide />, { ...size, fonts: fontConfig })
  }

  // Slides 2-6: commodity slides
  const def = WHAT_MOVES[slideNum]
  if (!def || typeof def === 'string') {
    return new Response('Not found', { status: 404 })
  }

  const prices = await fetchPrices()

  return new ImageResponse(
    <CommoditySlide slideNum={slideNum} totalSlides={totalSlides} def={def} prices={prices} />,
    { ...size, fonts: fontConfig }
  )
}
