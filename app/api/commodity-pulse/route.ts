import { NextResponse }  from 'next/server'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'
import { readFileSync }  from 'fs'
import path              from 'path'
import Anthropic         from '@anthropic-ai/sdk'

export const dynamic    = 'force-dynamic'
export const revalidate = 0

export interface PulseRow {
  name:   string
  unit:   string
  price:  string
  pct:    number
  driver: string
}

export interface PulseData {
  rows:        PulseRow[]
  theme:       string
  generatedAt: string
}

// ── Rule-based fallback drivers (no Claude needed) ────────────────────────────

const FALLBACK: Record<string, { up: string; dn: string; flat: string }> = {
  GOLD:    { up: 'DXY soft, safe haven bid',      dn: 'Risk-on, dollar strength',      flat: 'Range-bound, awaiting trigger'    },
  SILVER:  { up: 'Industrial + precious demand',  dn: 'Industrial slowdown fears',     flat: 'Consolidating near key level'     },
  CRUDE:   { up: 'Supply cut, demand recovery',   dn: 'Demand concerns, supply build', flat: 'OPEC+ stance in focus'            },
  COPPER:  { up: 'China demand recovery signal',  dn: 'China slowdown concerns',       flat: 'China PMI data awaited'           },
  'NAT GAS': { up: 'Demand pickup, supply tight', dn: 'Mild weather, supply ample',   flat: 'Storage levels in focus'          },
  RUPEE:   { up: 'FII inflows, RBI support',      dn: 'Dollar strength, FII outflow',  flat: 'RBI managing volatility'          },
}

function fallbackDriver(name: string, pct: number): string {
  const fb = FALLBACK[name]
  if (!fb) return ''
  if (pct > 0.05)  return fb.up
  if (pct < -0.05) return fb.dn
  return fb.flat
}

// ── Claude driver generation ──────────────────────────────────────────────────

async function generateDrivers(
  rows: Pick<PulseRow, 'name' | 'pct' | 'price'>[],
  headlines: string[],
): Promise<{ drivers: Record<string, string>; theme: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[commodity-pulse] ANTHROPIC_API_KEY not set — using fallback drivers')
    return null
  }

  const priceLines = rows.map(r =>
    `${r.name}: ${r.price} (${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(2)}%)`
  ).join('\n')

  const prompt = `You are a sharp commodity analyst for an Indian audience. Given today's MCX prices and recent news, write a 4–6 word driver for each commodity explaining WHY it moved. Also write one dominant macro theme sentence (max 10 words).

Prices today:
${priceLines}

Recent intelligence:
${headlines.slice(0, 5).join('\n')}

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "GOLD": "DXY weakness limits upside",
  "SILVER": "Industrial demand pickup Asia",
  "CRUDE": "OPEC+ output cut surprise",
  "COPPER": "China PMI data awaited",
  "NAT GAS": "Summer demand building",
  "RUPEE": "FII inflows support INR",
  "theme": "Dollar softening lifts commodity import costs"
}`

  const client = new Anthropic({ apiKey })

  const models = [
    { id: 'claude-sonnet-4-6',        label: 'Sonnet' },
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku'  },
  ]

  for (const { id, label } of models) {
    try {
      const msg  = await client.messages.create({
        model:      id,
        max_tokens: 400,
        messages:   [{ role: 'user', content: prompt }],
      })
      const raw  = msg.content[0].type === 'text' ? msg.content[0].text.trim() : null
      if (!raw) continue
      const text   = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const parsed = JSON.parse(text)
      const { theme, ...drivers } = parsed
      console.log(`[commodity-pulse] Claude ${label} OK`)
      return { drivers, theme }
    } catch (err) {
      const errMsg = (err as Error).message
      console.warn(`[commodity-pulse] Claude ${label} failed:`, errMsg)
      // On 529 overload, immediately try next model (Haiku)
      if (errMsg.includes('529')) continue
      // On other errors, bail out
      return null
    }
  }
  return null
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const snap = loadSnapshot()
    if (!snap) return NextResponse.json({ error: 'Prices unavailable' }, { status: 503 })
    const prices = snapshotToPriceData(snap)

    function fmt(v: number, dec = 0) {
      if (!v) return '—'
      return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: dec, minimumFractionDigits: dec })
    }

    const baseRows = [
      { name: 'GOLD',    unit: '/10g',   price: fmt(prices.gold?.mcx),       pct: prices.gold?.mcxChangePct    ?? 0 },
      { name: 'SILVER',  unit: '/kg',    price: fmt(prices.silver?.mcx),     pct: prices.silver?.mcxChangePct  ?? 0 },
      { name: 'CRUDE',   unit: '/bbl',   price: fmt(prices.crude?.mcx),      pct: prices.crude?.mcxChangePct   ?? 0 },
      { name: 'COPPER',  unit: '/kg',    price: fmt(prices.copper?.mcx, 2),  pct: prices.copper?.mcxChangePct  ?? 0 },
      { name: 'NAT GAS', unit: '/mmBtu', price: fmt(prices.natgas?.mcx, 2),  pct: prices.natgas?.mcxChangePct  ?? 0 },
      { name: 'RUPEE',   unit: '/USD',   price: '₹' + (prices.usdinr?.toFixed(2) ?? '—'), pct: prices.usdinrChangePct ?? 0 },
    ]

    // Load recent headlines for Claude context
    let headlines: string[] = []
    try {
      const news = JSON.parse(readFileSync(path.join(process.cwd(), 'data/ai-news.json'), 'utf8'))
      headlines  = (news as { title: string }[]).slice(0, 5).map(n => n.title)
    } catch {}

    const aiResult = await generateDrivers(baseRows, headlines)

    const rows: PulseRow[] = baseRows.map(r => ({
      ...r,
      driver: aiResult?.drivers?.[r.name] ?? fallbackDriver(r.name, r.pct),
    }))

    const theme = aiResult?.theme ?? 'Cross-commodity signals mixed — monitor DXY and RBI policy stance'

    const data: PulseData = { rows, theme, generatedAt: new Date().toISOString() }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('[commodity-pulse]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
