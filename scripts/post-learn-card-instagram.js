import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = join(__dirname, '../.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const TOPIC    = process.env.TOPIC ?? process.argv[2]
const IG_USER  = process.env.INSTAGRAM_USER_ID
const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN

const CAPTIONS = {
  'how-prices-move': `Most MCX traders are watching the wrong screen.

They track COMEX gold — and miss the ₹2,200 swing hiding inside USD/INR.

5 forces that actually move MCX prices 👇

1️⃣ USD/INR rate — The invisible hand
Rupee falls 2% = MCX gold +₹2,200/10g
Even when COMEX is completely flat.
This single factor can flip your entire P&L.

2️⃣ COMEX / NYMEX — The global price
MCX tracks international benchmarks within minutes.
By the time you see it on the news, it's already priced in.

3️⃣ Import duty — The government lever
A 2% duty cut = ₹2,000 drop in MCX gold overnight.
RBI policy and Union Budget are risk events. Mark your calendar.

4️⃣ Geopolitics — The fastest mover
Iran news. OPEC surprises. War headlines.
MCX Crude reacts in minutes — not hours.

5️⃣ China PMI (monthly)
PMI > 50 → Copper & Zinc rally
PMI < 50 → rethink your long positions

The rupee is the edge most retail commodity traders ignore completely.

Save this for your next trade 📌

More MCX education at bhaavbrief.in/learn

#MCX #MCXGold #MCXSilver #MCXCrude #MCXCopper #BhaavBrief #CommodityMarkets #TradingEducation #IndianMarkets #USDINR #MCXTrader #Commodities`,

  'mcx-basics': `98% of Indian traders have a demat account.

Less than 2% have a commodity trading account.

They're missing India's biggest intraday market 👇

MCX (Multi Commodity Exchange) in 7 facts:

✅ India's largest commodity derivatives exchange
✅ Regulated by SEBI since 2015
✅ Trades 9 AM – 11:30 PM IST (Mon–Fri)
✅ 98% of India's entire commodity futures volume
✅ Daily turnover: ₹50,000+ crore
✅ Commodities: Gold, Silver, Crude Oil, Natural Gas, Copper, Aluminium, Zinc, Lead, Nickel
✅ Needs a separate commodity trading account — not your equity demat

This is where India's jewellers, oil importers, and merchants manage price risk every single day.

You can be on the right side of that trade.

Follow @bhaavbrief — free daily MCX intelligence at 9:47 AM.

#MCX #CommodityMarkets #IndianMarkets #BhaavBrief #TradingEducation #MCXGold #MCXCrude #SEBI #Commodities #StockMarket #MCXTrader`,

  'margin-leverage': `The most common reason MCX traders lose money isn't the market.

It's forced squareoff.

On a volatile day, your broker closes your position — before you even get a chance to react.

Here's why it happens 👇

When you trade MCX, you only put up a fraction of the contract value (called margin).

MCX Gold Mini (100g):
Contract value: ~₹10 lakh
You pay: ~₹60,000
A 1% move = ₹10,000 P&L swing — on ₹60K margin

MCX Silver (30 kg):
Contract value: ~₹30 lakh
You pay: ~₹1.8 lakh
A 1% move = ₹30,000 P&L swing

MCX Crude (100 bbl):
Contract value: ~₹6.5 lakh
You pay: ~₹39,000
A 1% move = ₹6,500 P&L swing

This is leverage. Every 1% market move hits your margin hard.

If your account balance falls below the minimum margin — your broker squares off your position. No warning. No waiting.

The rule most traders learn only after getting burned:

Always keep 20–30% buffer above minimum margin.

MTM (Mark to Market) = your P&L settles to cash every evening.
Losses are deducted overnight. Not at expiry. Every. Single. Day.

Save this before your next trade 📌

Full MCX education at bhaavbrief.in/learn

#MCX #MCXGold #MCXCrude #MCXSilver #Margin #ForcedSquareoff #CommodityTrading #BhaavBrief #TradingEducation #MCXTrader #IndianMarkets #Leverage`,

  'gold-contracts': `Most people know gold is traded on MCX.

Almost nobody knows there are 4 different contracts — and picking the wrong one costs you money.

MCX Gold contracts explained 👇

🥇 Gold Standard (1 kg)
Margin: ~₹5–7 lakh | P&L per tick: ₹100
→ For serious traders with high capital

🥈 Gold Mini (100g)
Margin: ~₹55–75K | P&L per tick: ₹10
→ Most popular. Best liquidity for retail traders

🥉 Gold Guinea (8g)
Margin: ~₹5–8K | P&L per tick: ₹1
→ For micro-exposure or jeweller hedging

💛 Gold Petal (1g)
Margin: ~₹700–1.2K | P&L per tick: ₹1
→ Lowest entry. Good for learning with real money

Standard & Mini expire 5th of the month.
Guinea & Petal expire last day of the month.

Pick the contract that matches your capital and risk.

Save this 📌

Learn MCX at bhaavbrief.in/learn

#MCXGold #MCX #GoldTrading #CommodityMarkets #BhaavBrief #TradingEducation #IndianMarkets #GoldMini #MCXTrader #Commodities`,

  'taxation': `Nobody talks about this before they start trading MCX.

Then tax season hits and they're scrambling.

MCX tax in India — the complete breakdown 👇

📋 Income tax: Your regular slab rate
(Not 15% STCG. Not 20% LTCG. Your full tax slab.)

📋 CTT (Commodity Transaction Tax): 0.01% on the sell side
Good news: it's deductible as a business expense

📋 Exchange charges: ~0.0026% on both sides
Also deductible

📋 GST on brokerage: 18%
Applied on brokerage + exchange charges

📋 Loss carry forward: 8 years
Against other business income — NOT salary income

📋 STT: ₹0 (nil)
STT does not apply to commodity futures — a big advantage

Key insight: All MCX profits are "non-speculative business income."
File ITR-3. Hire a CA who understands derivatives.

Tax planning is part of trading. Start knowing this before you start trading.

More at bhaavbrief.in/learn

#MCX #TaxIndia #TradingTax #CommodityMarkets #BhaavBrief #TradingEducation #ITR3 #IndianMarkets #MCXTrader #IncomeTax`,

  'hedging': `A jeweller receives a ₹50 lakh gold order.
Delivery: 45 days later.

What happens if gold rises ₹5,000/10g before then?

This is how real hedging works on MCX 👇

Day 0: Order received at ₹1,00,000/10g
Risk: Price rises before delivery

TODAY: Buy MCX Gold futures at ₹1,00,000/10g

30 days later: Physical gold is now at ₹1,05,000/10g

Close futures position → ₹5 lakh profit on the futures trade

₹5 lakh profit offsets the higher physical cost

Net cost: ₹1,00,000/10g — exactly as budgeted

This isn't speculation. This is price risk management.

Gold Mini (100g, ~₹70K margin) makes this accessible even for small jewellers.

Rule: Hedge only committed exposure — not inventory you're sitting on.

MCX exists because these businesses need this protection every day.

More at bhaavbrief.in/learn

#MCXGold #Hedging #CommodityMarkets #BhaavBrief #TradingEducation #Jewellery #MCXTrader #IndianMarkets #GoldHedge #RiskManagement`,
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
  return true
}

async function main() {
  if (!IG_USER || !IG_TOKEN) {
    console.error('INSTAGRAM_USER_ID or INSTAGRAM_ACCESS_TOKEN not configured')
    process.exit(1)
  }
  if (!TOPIC) {
    console.error('Usage: TOPIC=<slug> node scripts/post-learn-card-instagram.js')
    console.error('Available topics:', Object.keys(CAPTIONS).join(', '))
    process.exit(1)
  }

  const caption = CAPTIONS[TOPIC]
  if (!caption) {
    console.error(`No caption defined for topic: ${TOPIC}`)
    console.error('Available topics:', Object.keys(CAPTIONS).join(', '))
    process.exit(1)
  }

  const imageUrl = `https://bhaavbrief.in/api/learn-card/${TOPIC}`
  console.log(`Posting learn card: ${TOPIC}`)
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

  console.log(`✓ Posted learn card to Instagram: https://www.instagram.com/p/${publishData.id}`)
}

main().catch(e => { console.error(e); process.exit(1) })
