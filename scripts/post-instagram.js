import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = join(__dirname, '../.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const EDITION  = parseInt(process.env.EDITION ?? '1')
const IG_USER  = process.env.INSTAGRAM_USER_ID
const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN

// Per-instrument hashtag clusters (4-5 tags each, rotated into the caption block)
const TAG_HASHTAGS = {
  'MCX Gold':    ['#MCXGold', '#GoldIndia', '#MCXTrading', '#SonaChandiBhav', '#GoldFutures'],
  'MCX Silver':  ['#MCXSilver', '#SilverIndia', '#MCXTrading', '#ChandiBhav', '#SilverFutures'],
  'MCX Crude':   ['#MCXCrude', '#CrudeOilIndia', '#CrudeFutures', '#OilAndGas', '#MCXTrading'],
  'MCX Copper':  ['#MCXCopper', '#CopperIndia', '#BaseMetals', '#MCXTrading', '#CopperFutures'],
  'MCX NatGas':  ['#MCXNatGas', '#NaturalGasIndia', '#MCXTrading', '#NatGasFutures', '#EnergyMarkets'],
  'Macro':       ['#MacroEconomics', '#GlobalMarkets', '#CommodityMarkets', '#EconomicData'],
  'Geopolitics': ['#Geopolitics', '#GlobalMarkets', '#CommodityMarkets', '#MarketMovers'],
  'OPEC':        ['#OPEC', '#OilMarkets', '#CrudeOilIndia', '#EnergyMarkets'],
  'RBI':         ['#RBI', '#RBIPolicy', '#IndianEconomy', '#RupeeWatch'],
  'Fed':         ['#FederalReserve', '#FedPolicy', '#GlobalMarkets', '#DollarIndia'],
  'USD/INR':     ['#USDINR', '#RupeeWatch', '#ForexIndia', '#CurrencyMarkets'],
  'Inflation':   ['#Inflation', '#CPI', '#MacroEconomics', '#IndianEconomy'],
}

// Rotating engagement questions per primary instrument
const ENGAGEMENT_QUESTIONS = {
  'MCX Gold':   [
    'What\'s your MCX Gold target this week? Drop it below 👇',
    'Are you buying this dip or waiting for more confirmation? 👇',
    'Long or short on MCX Gold tonight? 👇',
    'What level are you watching on Gold? 👇',
    'Holding positions into the weekend? 👇',
  ],
  'MCX Crude':  [
    'Trading tonight\'s session? What\'s your crude level? 👇',
    'Watching EIA inventory data this week? 👇',
    'Long or short on MCX Crude? Drop your view 👇',
    'Are you hedging crude exposure right now? 👇',
    'What\'s your crude target for the week? 👇',
  ],
  'MCX Silver': [
    'Silver catching up to gold — or diverging? Your read 👇',
    'What\'s your MCX Silver level to watch? 👇',
    'Long silver or waiting for a pullback? 👇',
  ],
  'default': [
    'What\'s your read on today\'s move? Drop it below 👇',
    'How are you positioning around this? 👇',
    'Agree with this analysis? Share your view 👇',
    'What levels are you watching this week? 👇',
  ],
}

async function fetchLivePrices() {
  try {
    const r = await fetch('https://www.bhaavbrief.in/api/prices', { signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

function formatHookLine(tags, prices) {
  if (!prices) return null
  const priceMap = {
    'MCX Gold':   { val: prices.gold?.mcx,   pct: prices.goldComexPct,  unit: '/10g' },
    'MCX Crude':  { val: prices.crude?.mcx,  pct: prices.crudePct,      unit: '/bbl' },
    'MCX Silver': { val: prices.silver?.mcx, pct: prices.silverComexPct, unit: '/kg' },
    'MCX Copper': { val: prices.copper?.mcx, pct: prices.copperPct,     unit: '/kg' },
    'MCX NatGas': { val: prices.natgas?.mcx, pct: prices.natgasPct,     unit: '/mmBtu' },
  }
  for (const tag of tags) {
    const p = priceMap[tag]
    if (!p || p.val == null || p.pct == null) continue
    const n = parseFloat(p.pct)
    const arrow = n >= 0 ? '▲' : '▼'
    const sign  = n >= 0 ? '+' : ''
    return `${tag} ${arrow} ${sign}${Math.abs(n).toFixed(2)}% → ₹${Math.round(p.val).toLocaleString('en-IN')}${p.unit}`
  }
  return null
}

function pickEngagementQuestion(tags, edition) {
  for (const tag of tags) {
    const qs = ENGAGEMENT_QUESTIONS[tag]
    if (qs) return qs[edition % qs.length]
  }
  const qs = ENGAGEMENT_QUESTIONS.default
  return qs[edition % qs.length]
}

function buildHashtagBlock(tags) {
  const seen = new Set()
  const out  = []
  for (const tag of tags) {
    const cluster = TAG_HASHTAGS[tag]
    if (!cluster) continue
    for (const h of cluster) {
      if (!seen.has(h)) { seen.add(h); out.push(h) }
    }
  }
  // Always include base brand tags
  for (const h of ['#BhaavBrief', '#MCX', '#CommodityMarkets', '#IndianMarkets', '#MCXIntelligence']) {
    if (!seen.has(h)) { seen.add(h); out.push(h) }
  }
  return out.slice(0, 28).join(' ')
}

async function checkContainerStatus(containerId, retries = 8) {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const r = await fetch(
      `https://graph.facebook.com/v22.0/${containerId}?fields=status_code&access_token=${IG_TOKEN}`
    )
    const d = await r.json()
    if (d.status_code === 'FINISHED') return true
    if (d.status_code === 'ERROR') throw new Error(`Container processing failed: ${JSON.stringify(d)}`)
    console.log(`Container status: ${d.status_code ?? 'PENDING'} (attempt ${i + 1}/${retries})`)
  }
  return true // proceed anyway after max retries
}

async function main() {
  if (!IG_USER || !IG_TOKEN) {
    console.log('INSTAGRAM_USER_ID or INSTAGRAM_ACCESS_TOKEN not configured — skipping')
    process.exit(0)
  }

  const slug    = `edition-${String(EDITION).padStart(3, '0')}`
  const mdxPath = join(process.cwd(), 'content/briefs', `${slug}.mdx`)
  if (!existsSync(mdxPath)) {
    console.error(`Brief not found: ${mdxPath}`)
    process.exit(1)
  }

  const { data } = matter(readFileSync(mdxPath, 'utf8'))
  const title    = data.title       ?? ''
  const desc     = data.description ?? ''
  const tags     = data.tags ?? []
  const edition  = data.edition ?? EDITION

  const imageUrl = `https://bhaavbrief.in/instagram/${slug}.jpg?v=${Date.now()}`
  const briefUrl = `https://bhaavbrief.in/briefs/${slug}`

  const prices    = await fetchLivePrices()
  const hookLine  = formatHookLine(tags, prices)
  const engageQ   = pickEngagementQuestion(tags, edition)
  const hashBlock = buildHashtagBlock(tags)

  const captionParts = []
  if (hookLine) captionParts.push(hookLine, '')
  captionParts.push(title, '', desc, '', engageQ, '', hashBlock, '', `Full brief → ${briefUrl}`)
  const caption = captionParts.join('\n').trim()

  console.log(`Posting Edition #${EDITION} to Instagram`)
  console.log(`Image: ${imageUrl}`)

  // Step 1 — Create media container
  const createRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: IG_TOKEN }),
  })
  const createData = await createRes.json()
  if (createData.error) {
    console.error('Container creation error:', createData.error.message)
    process.exit(1)
  }
  if (!createData.id) {
    console.error('No container ID returned:', JSON.stringify(createData))
    process.exit(1)
  }
  console.log(`Container created: ${createData.id}`)

  // Step 2 — Wait for container to finish processing
  await checkContainerStatus(createData.id)

  // Step 3 — Publish
  const publishRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: createData.id, access_token: IG_TOKEN }),
  })
  const publishData = await publishRes.json()
  if (publishData.error) {
    console.error('Publish error:', publishData.error.message)
    process.exit(1)
  }
  if (!publishData.id) {
    console.error('No post ID returned:', JSON.stringify(publishData))
    process.exit(1)
  }

  console.log(`✓ Posted to Instagram: ${publishData.id}`)
}

main().catch(e => { console.error('Instagram posting failed:', e.message); process.exit(1) })
