// Post the weekly "Proof, Not Predictions" carousel to Instagram.
// Reads the current claim selection from data/proof-carousel-history.json
// (written by generate-proof-carousel.js) and data/claims.json.
// Usage: node scripts/post-proof-carousel.js

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const envFile = join(ROOT, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const IG_USER  = process.env.INSTAGRAM_USER_ID
const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN
const BASE_URL = process.env.BASE_URL ?? 'https://bhaavbrief.in'
const SLIDES   = 7

function substituteTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? `{${k}}`)
}

function loadClaimStatements() {
  const histPath = join(ROOT, 'data/proof-carousel-history.json')
  if (!existsSync(histPath)) {
    console.error('No data/proof-carousel-history.json found. Run generate-proof-carousel.js first.')
    process.exit(1)
  }
  const hist = JSON.parse(readFileSync(histPath, 'utf8'))
  const claimIds = hist.lastClaimIds ?? []
  if (claimIds.length === 0) {
    console.error('No claim IDs in data/proof-carousel-history.json')
    process.exit(1)
  }

  const claims = JSON.parse(readFileSync(join(ROOT, 'data/claims.json'), 'utf8')).claims ?? []
  const byId = new Map(claims.map(c => [c.claim_id, c]))

  return claimIds.map(id => {
    const c = byId.get(id)
    if (!c) throw new Error(`Claim not found in data/claims.json: ${id}`)
    return substituteTemplate(c.statement_template, c.values)
  })
}

function buildCaption(statements) {
  return [
    'We don’t guess what moves MCX. We measured it.',
    '',
    ...statements.map(s => `→ ${s}`),
    '',
    'Swipe through the numbers 👆',
    '',
    'BhaavBrief — daily MCX intelligence at 9:30 AM. Free brief at bhaavbrief.in',
    '',
    '#MCX #BhaavBrief #CommodityMarkets #TradingEducation #IndianMarkets #MCXTrading',
  ].join('\n')
}

async function waitForContainer(containerId, retries = 10) {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const r = await fetch(
      `https://graph.facebook.com/v22.0/${containerId}?fields=status_code&access_token=${IG_TOKEN}`
    )
    const d = await r.json()
    console.log(`  Container ${containerId}: ${d.status_code ?? 'PENDING'} (${i + 1}/${retries})`)
    if (d.status_code === 'FINISHED') return true
    if (d.status_code === 'ERROR') throw new Error(`Container failed: ${JSON.stringify(d)}`)
  }
  return true
}

async function createChildContainer(imageUrl) {
  const r = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, is_carousel_item: true, access_token: IG_TOKEN }),
  })
  const d = await r.json()
  if (d.error) throw new Error(`Child container error: ${d.error.message}`)
  if (!d.id)   throw new Error(`No ID for child: ${JSON.stringify(d)}`)
  return d.id
}

async function main() {
  if (!IG_USER || !IG_TOKEN) {
    console.log('INSTAGRAM_USER_ID or INSTAGRAM_ACCESS_TOKEN not configured — skipping')
    process.exit(0)
  }

  const statements = loadClaimStatements()
  const caption = buildCaption(statements)

  console.log(`\nPosting Proof carousel (${SLIDES} slides)`)

  // Step 1 — Child containers for each slide
  const childIds = []
  for (let i = 1; i <= SLIDES; i++) {
    const url = `${BASE_URL}/instagram/carousel-proof-slide-${i}.jpg?v=${Date.now()}`
    console.log(`Creating child container for slide ${i}: ${url}`)
    const id = await createChildContainer(url)
    console.log(`  → ${id}`)
    childIds.push(id)
    if (i < SLIDES) await new Promise(r => setTimeout(r, 1000))
  }

  console.log(`\nWaiting for ${childIds.length} containers to finish processing...`)
  for (const id of childIds) await waitForContainer(id)

  // Step 2 — Carousel container
  console.log('\nCreating carousel container...')
  const carouselRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption,
      access_token: IG_TOKEN,
    }),
  })
  const carouselData = await carouselRes.json()
  if (carouselData.error) throw new Error(`Carousel container error: ${carouselData.error.message}`)
  if (!carouselData.id)   throw new Error(`No carousel ID: ${JSON.stringify(carouselData)}`)

  console.log(`Carousel container: ${carouselData.id}`)
  await waitForContainer(carouselData.id)

  // Step 3 — Publish
  console.log('\nPublishing carousel...')
  const publishRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: carouselData.id, access_token: IG_TOKEN }),
  })
  const publishData = await publishRes.json()
  if (publishData.error) throw new Error(`Publish error: ${publishData.error.message}`)
  if (!publishData.id)   throw new Error(`No post ID: ${JSON.stringify(publishData)}`)

  console.log(`\n✓ Proof carousel posted: ${publishData.id}`)
}

main().catch(e => { console.error('\nPosting failed:', e.message); process.exit(1) })
