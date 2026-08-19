// Post the weekly MCX Myth Buster carousel to Instagram.
// Reads the current myth from data/mythbuster-history.json (written by generate-mythbuster-carousel.js).
// Usage: node scripts/post-mythbuster-carousel.js

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
const SLIDES   = 5

function loadCurrentMyth() {
  const histPath = join(ROOT, 'data/mythbuster-history.json')
  if (!existsSync(histPath)) {
    console.error('No data/mythbuster-history.json found. Run generate-mythbuster-carousel.js first.')
    process.exit(1)
  }
  const hist = JSON.parse(readFileSync(histPath, 'utf8'))
  const slug = process.env.TOPIC || hist.lastSlug
  if (!slug) {
    console.error('No topic slug in history or TOPIC env var')
    process.exit(1)
  }

  const topicsPath = join(ROOT, 'data/mythbuster-topics.json')
  const data = JSON.parse(readFileSync(topicsPath, 'utf8'))
  const myth = data.myths[slug]
  if (!myth) {
    console.error(`Topic not found in mythbuster-topics.json: ${slug}`)
    process.exit(1)
  }
  return { slug, myth }
}

function buildCaption(myth) {
  return [
    myth.myth,
    '',
    'Most traders believe this. The real mechanism is very different.',
    '',
    'Swipe through to understand why 👆',
    '',
    'BhaavBrief — daily MCX intelligence at 9:30 AM. Free brief at bhaavbrief.in',
    '',
    myth.hashtags ?? '#MCX #BhaavBrief #CommodityMarkets #TradingEducation #IndianMarkets #MCXMythBuster',
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

  const { slug, myth } = loadCurrentMyth()
  const caption = buildCaption(myth)

  console.log(`\nPosting Myth Buster carousel: ${slug} (${SLIDES} slides)`)

  // Step 1 — Child containers for each slide
  const childIds = []
  for (let i = 1; i <= SLIDES; i++) {
    const url = `${BASE_URL}/instagram/carousel-mythbuster-slide-${i}.jpg?v=${Date.now()}`
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

  console.log(`\n✓ Myth Buster carousel posted: ${publishData.id}`)
  console.log(`  Topic: ${slug}`)
}

main().catch(e => { console.error('\nPosting failed:', e.message); process.exit(1) })
