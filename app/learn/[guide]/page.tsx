import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/seo'

type GuideKey =
  | 'mcx-silver-contracts'
  | 'mcx-crude-oil-contracts'
  | 'mcx-natural-gas-contracts'
  | 'mcx-open-interest-explained'
  | 'mcx-import-parity-explained'
  | 'mcx-contango-backwardation'

type Guide = {
  title: string
  description: string
  keywords: string[]
  eyebrow: string
  answer: string
  sections: Array<{ heading: string; body: string[] }>
  faqs: Array<{ question: string; answer: string }>
  links: Array<{ href: string; label: string; description: string }>
  sourceNote: string
}

const BASE = 'https://bhaavbrief.in'
const REVIEWED = '30 September 2026'

const GUIDES: Record<GuideKey, Guide> = {
  'mcx-silver-contracts': {
    title: 'MCX Silver Contracts 2026: Lot Size, Tick Value & Contract Value',
    description: 'MCX Silver contract guide for Indian traders: standard lot size, quote unit, tick value, live contract value and where to verify the current contract specification.',
    keywords: ['MCX silver lot size', 'MCX silver contract size', 'MCX silver tick value', 'MCX silver contract value'],
    eyebrow: 'MCX contract reference',
    answer: 'The standard MCX Silver futures contract represents 30 kg and is quoted in rupees per kilogram. A ₹1 move in the quoted price changes one standard lot by ₹30. Contract specifications, listed expiries and margins can change, so use the exchange contract page and your broker’s margin screen before placing an order.',
    sections: [
      { heading: 'How to read an MCX Silver quote', body: [
        'MCX Silver is quoted as ₹ per kilogram, while the standard futures lot is 30 kg. The notional value is therefore the displayed futures price multiplied by 30. This is the amount whose price movement drives profit and loss; it is not the same as the margin blocked by the broker.',
        'For example, a ₹100/kg move changes the standard-lot value by ₹3,000 (₹100 × 30 kg). The direction of the position determines whether that change is a gain or loss. This is an illustration of contract arithmetic, not a view on silver prices.'
      ]},
      { heading: 'Lot size, tick size and margin are different', body: [
        'Lot size tells you the quantity in one contract. Tick size is the smallest quoted price change. Tick value is the rupee effect of one tick across that lot. Margin is collateral set through the exchange risk framework and broker policy; it changes with volatility and is not a fixed percentage promised by this page.',
        'If a smaller silver contract is listed by MCX, read its individual contract specification rather than scaling the standard contract from memory. Contract symbols, expiry calendars and delivery rules should be verified from the current exchange circular or contract page.'
      ]},
      { heading: 'What to check before expiry', body: [
        'Futures are time-bound contracts. Confirm the selected expiry, liquidity and delivery rules before holding a position near expiry. If you intend to maintain exposure beyond the selected month, the relevant comparison is the live spread between the near and next contracts, not a generic historical rollover estimate.',
        'BhaavBrief’s live markets page is useful for price context; the exchange remains the source of record for contract specifications and delivery obligations.'
      ]}
    ],
    faqs: [
      { question: 'What is the MCX Silver standard lot size?', answer: 'The standard MCX Silver futures contract represents 30 kg. Confirm the active contract specification on MCX before trading because exchange specifications can change.' },
      { question: 'How much does a ₹1 move in MCX Silver affect one standard lot?', answer: 'Because the standard lot is 30 kg and Silver is quoted per kilogram, a ₹1/kg move changes the standard-lot value by ₹30.' },
      { question: 'Is contract value the same as margin?', answer: 'No. Contract value is price multiplied by lot size. Margin is collateral required by the exchange and broker and can change with volatility.' }
    ],
    links: [
      { href: '/learn/mcx-lot-sizes', label: 'MCX lot sizes', description: 'Compare quote units and lot sizes across major MCX contracts.' },
      { href: '/commodities/silver', label: 'Live MCX Silver context', description: 'See the current Silver market page and benchmark context.' },
      { href: '/options/silver', label: 'MCX Silver options', description: 'Open the Silver futures-options analytics surface.' }
    ],
    sourceNote: 'Contract quantity and quote convention should be verified against the current MCX Silver contract specification.'
  },
  'mcx-crude-oil-contracts': {
    title: 'MCX Crude Oil Contracts 2026: Lot Size, Tick Value & Contract Value',
    description: 'MCX Crude Oil futures guide: standard contract lot size, quote unit, tick value, live contract value arithmetic and expiry checks for Indian traders.',
    keywords: ['MCX crude oil lot size', 'MCX crude oil contract size', 'MCX crude oil tick value', 'MCX crude oil contract value'],
    eyebrow: 'MCX contract reference',
    answer: 'The standard MCX Crude Oil futures contract represents 100 barrels and is quoted in rupees per barrel. A ₹1 move in the quote changes one standard lot by ₹100. Verify the active expiry, contract specification and margin in the current MCX contract record before trading.',
    sections: [
      { heading: 'Crude Oil contract arithmetic', body: [
        'The standard contract value is the MCX Crude Oil futures price multiplied by 100 barrels. A ₹50/barrel move therefore changes the standard-lot value by ₹5,000. This calculation explains exposure; it does not describe the amount of capital required or forecast a move.',
        'MCX Crude Oil is distinct from a physical petrol or diesel purchase. It is a listed derivatives contract with its own expiry, settlement rules, risk requirements and trading hours.'
      ]},
      { heading: 'Why expiry matters more in crude', body: [
        'Crude Oil has a defined contract month. The near-month and next-month futures may trade at different prices because of the live market curve. Before any rollover decision, compare the actual contracts and their liquidity; a fixed “normal” roll cost is not reliable.',
        'For anyone using options, identify the underlying futures expiry first. Option-chain metrics such as open interest, implied volatility, PCR and max pain are expiry-specific and should not be treated as a direction call.'
      ]},
      { heading: 'Margin and price risk', body: [
        'Margin is set dynamically by the exchange risk system and the broker. It is separate from the 100-barrel contract value. A small percentage move in crude can create a larger percentage movement in the margin posted, which is why an independent margin check and a sufficient buffer matter.',
        'Use only the exchange and broker’s current figures for executable decisions. BhaavBrief provides market context and analytics, not trading advice.'
      ]}
    ],
    faqs: [
      { question: 'What is the MCX Crude Oil standard lot size?', answer: 'The standard MCX Crude Oil futures contract represents 100 barrels. Confirm the active contract’s specification with MCX before trading.' },
      { question: 'What is the tick value for one standard MCX Crude Oil lot?', answer: 'Crude Oil is quoted in rupees per barrel. A ₹1 move across a 100-barrel standard lot changes its value by ₹100.' },
      { question: 'Where can I see live MCX Crude Oil option analytics?', answer: 'BhaavBrief’s Crude Oil options page provides live options analytics by available expiry; use it alongside the exchange specification for contract details.' }
    ],
    links: [
      { href: '/learn/mcx-rollover', label: 'MCX futures rollover guide', description: 'Understand the mechanics of moving from one futures expiry to another.' },
      { href: '/commodities/crude-oil', label: 'Live MCX Crude Oil context', description: 'See current crude market context and benchmarks.' },
      { href: '/options/crude-oil', label: 'MCX Crude Oil options', description: 'Review Crude Oil option-chain analytics by expiry.' }
    ],
    sourceNote: 'The standard contract reference is 100 barrels; verify the specific listed contract and delivery calendar on MCX.'
  },
  'mcx-natural-gas-contracts': {
    title: 'MCX Natural Gas Contracts 2026: Lot Size, Tick Value & Contract Value',
    description: 'MCX Natural Gas futures guide: standard lot size, quote unit, tick value, live contract-value arithmetic, expiry considerations and options context.',
    keywords: ['MCX natural gas lot size', 'MCX natural gas contract size', 'MCX natural gas tick value', 'MCX natural gas contract value'],
    eyebrow: 'MCX contract reference',
    answer: 'The standard MCX Natural Gas futures contract represents 1,250 mmBtu and is quoted in rupees per mmBtu. A ₹0.10 move changes one standard lot by ₹125. Check the listed expiry, contract specification and current margin directly with MCX and your broker before trading.',
    sections: [
      { heading: 'Natural Gas quote and tick value', body: [
        'Natural Gas is quoted in ₹ per mmBtu. With a 1,250 mmBtu standard lot, the smallest ₹0.10 quote movement changes the standard-lot value by ₹125. A ₹10/mmBtu move changes it by ₹12,500.',
        'This sensitivity is why it is important to distinguish a price move from a percentage move. Natural Gas can have a different volatility profile from precious metals or crude, and a margin figure from another commodity is not a substitute for a current Nat Gas margin check.'
      ]},
      { heading: 'Expiry and the global reference', body: [
        'MCX Natural Gas is a futures contract with a specific listed month. The active MCX contract should be assessed alongside its expiry and the relevant global natural-gas context, rather than by assuming every contract month behaves the same way.',
        'Scheduled US storage data is one part of the context traders watch. An event is not a prediction: the effect depends on the released number, expectations, weather, positioning and the contract month.'
      ]},
      { heading: 'Options use the futures contract as underlying', body: [
        'Natural Gas options are written on futures, so each options expiry must be interpreted with its corresponding futures contract. Options metrics provide a map of the current market structure; they do not establish a guaranteed future direction.',
        'For live chain data, use the options page. For contractual obligations, use the official MCX contract record.'
      ]}
    ],
    faqs: [
      { question: 'What is the MCX Natural Gas standard lot size?', answer: 'The standard MCX Natural Gas futures contract represents 1,250 mmBtu. Check the current exchange specification for the active contract.' },
      { question: 'What is the value of a ₹0.10 move in MCX Natural Gas?', answer: 'For a 1,250 mmBtu standard lot, a ₹0.10/mmBtu move changes the contract value by ₹125.' },
      { question: 'Do MCX Natural Gas options use Black-76?', answer: 'Commodity options on futures are commonly analysed with futures-options methods such as Black-76. BhaavBrief’s option pages show live contract-specific analytics.' }
    ],
    links: [
      { href: '/learn/mcx-lot-sizes', label: 'MCX lot sizes', description: 'Compare Natural Gas with other MCX futures contract sizes.' },
      { href: '/commodities/natural-gas', label: 'Live MCX Natural Gas context', description: 'See the Natural Gas market page and global reference context.' },
      { href: '/options/natural-gas', label: 'MCX Natural Gas options', description: 'Review live Natural Gas option analytics by available expiry.' }
    ],
    sourceNote: 'Quantity and tick arithmetic are based on the standard contract; MCX and broker information is authoritative for the active listing.'
  },
  'mcx-open-interest-explained': {
    title: 'MCX Open Interest Explained: OI Buildup, Price & Volume',
    description: 'Understand MCX open interest: what OI measures, how it differs from volume, how to read price and OI changes, and why it is not a standalone trading signal.',
    keywords: ['MCX open interest meaning', 'MCX OI buildup', 'open interest vs volume MCX', 'MCX long buildup short buildup'],
    eyebrow: 'MCX options education',
    answer: 'Open interest (OI) is the number of outstanding futures or options contracts that have not been closed, exercised or expired. It is different from volume, which counts contracts traded during a period. OI can describe participation and positioning changes, but it cannot by itself tell you what price will do next.',
    sections: [
      { heading: 'Open interest versus volume', body: [
        'Volume answers “how much traded today?” Open interest answers “how many contracts remain open?” A trade can add to OI when both sides open new positions, reduce OI when both sides close positions, or leave OI unchanged when an existing position changes hands.',
        'Both metrics need the contract and time window attached. Comparing OI across different expiries without context can be misleading because liquidity often migrates as expiry approaches.'
      ]},
      { heading: 'The four common price–OI labels', body: [
        'Market commentary often uses four descriptive labels: price up with OI up is called long buildup; price down with OI up is called short buildup; price up with OI down is called short covering; and price down with OI down is called long unwinding. These labels describe a pattern in the data, not the identity or conviction of every participant.',
        'A price–OI pair does not reveal hedging activity, option structures, spread trades or the next session’s move. Treat it as one input and compare it with price, volume, contract expiry and event risk.'
      ]},
      { heading: 'OI in an option chain', body: [
        'In options, OI is strike- and expiry-specific. Large OI at one strike can be a hedge, a spread leg or a directional position; it is not automatically “support” or “resistance.” PCR, implied volatility and price action can add useful context, but none is a trade instruction.',
        'BhaavBrief’s OI Buildup tool lets readers inspect the history rather than relying on a one-line interpretation.'
      ]}
    ],
    faqs: [
      { question: 'What does open interest mean in MCX?', answer: 'Open interest is the number of futures or options contracts still outstanding at a point in time. It differs from trading volume, which counts contracts traded during a period.' },
      { question: 'What is long buildup in MCX?', answer: 'Long buildup is a descriptive label used when price and open interest both rise. It does not prove that every new position is bullish or predict the next move.' },
      { question: 'Is open interest a buy or sell signal?', answer: 'No. OI describes outstanding positions and must be interpreted with price, volume, expiry, volatility and event context. It is not a standalone buy or sell signal.' }
    ],
    links: [
      { href: '/tools/mcx-open-interest', label: 'MCX OI Buildup tool', description: 'Inspect historical OI buildup data by available contract.' },
      { href: '/tools/mcx-pcr', label: 'MCX PCR trend', description: 'Use PCR as complementary options context, not a direction call.' },
      { href: '/options', label: 'MCX option chain', description: 'Explore live expiry- and strike-specific option analytics.' }
    ],
    sourceNote: 'Definitions follow standard derivatives-market terminology; use the exchange and broker terminal for current contract data.'
  },
  'mcx-import-parity-explained': {
    title: 'MCX Import Parity Explained: Gold, Silver, USD/INR & Basis',
    description: 'Learn how import parity connects global commodity benchmarks, USD/INR and India-specific costs to MCX Gold and Silver context—without treating parity as a price target.',
    keywords: ['MCX import parity', 'MCX gold import parity', 'MCX gold premium over COMEX', 'USD INR impact on MCX gold'],
    eyebrow: 'India-specific price context',
    answer: 'Import parity is a reference calculation that translates an international commodity benchmark into an India-relevant rupee value using unit conversion, USD/INR and applicable import-related costs. It is a context tool, not a guaranteed MCX price or a trading signal: futures expiry, local liquidity, taxes, quality, timing and data sources can all create a difference.',
    sections: [
      { heading: 'The building blocks of a parity reference', body: [
        'For gold or silver, start with the appropriate international benchmark, convert its unit, translate dollars to rupees at USD/INR, then apply the applicable India-specific costs and tax treatment for the use case. The exact inputs and treatment can change, so a current calculation must disclose its source and timestamp.',
        'MCX price and a parity reference can differ for legitimate reasons. They may reflect different contract months, different timestamps, local supply and demand, financing, delivery location, quality specifications or a stale input.'
      ]},
      { heading: 'Why USD/INR is part of the calculation', body: [
        'Global metals are commonly referenced in US dollars. If the benchmark is unchanged but the rupee weakens against the dollar, the rupee translation rises; if the rupee strengthens, it falls. This is an arithmetic relationship, not a forecast of either currency or metal prices.',
        'A useful parity dashboard should show the inputs and the timestamp, rather than presenting a single unexplained premium as a conclusion.'
      ]},
      { heading: 'How to use parity responsibly', body: [
        'Use parity to ask better questions: Which benchmark and contract month are being compared? Are the timestamps aligned? Are the input units compatible? Is a reported spread within the quality limits of the data feed? These checks matter before interpreting a difference.',
        'BhaavBrief’s basis surfaces are designed for transparent market context. They are educational tools and do not give buy, sell or price-target advice.'
      ]}
    ],
    faqs: [
      { question: 'What is import parity in MCX Gold?', answer: 'Import parity is a reference value that converts an international gold benchmark into an India-relevant rupee value using unit conversion, USD/INR and applicable costs. It is not a guaranteed MCX settlement price.' },
      { question: 'Why can MCX Gold differ from COMEX Gold converted to rupees?', answer: 'The comparison can differ because of currency, contract month, time, India-specific costs, local basis, delivery and data-source differences.' },
      { question: 'Does a high parity spread predict the MCX Gold price?', answer: 'No. A spread is a context observation, not a price forecast. Check input quality and the specific contracts before drawing conclusions.' }
    ],
    links: [
      { href: '/basis', label: 'BhaavBrief basis dashboard', description: 'View transparent live benchmark and currency context.' },
      { href: '/learn/why-usdinr-affects-mcx-gold', label: 'Why USD/INR moves MCX Gold', description: 'Understand the rupee conversion element in more detail.' },
      { href: '/commodities/gold', label: 'Live MCX Gold context', description: 'See the Gold market page and reference data.' }
    ],
    sourceNote: 'Any executable import-parity calculation needs a timestamped benchmark, currency rate and current official duty/tax treatment.'
  },
  'mcx-contango-backwardation': {
    title: 'Contango & Backwardation in MCX: Futures Curve Explained',
    description: 'Clear MCX guide to contango and backwardation: what the futures curve shows, how rollover arithmetic works and why the curve is not a directional trading signal.',
    keywords: ['MCX contango meaning', 'MCX backwardation meaning', 'MCX rollover cost', 'futures curve MCX'],
    eyebrow: 'MCX futures education',
    answer: 'Contango means a later-expiry futures contract trades above a nearer expiry; backwardation means the later contract trades below the nearer one. The difference is the futures curve, and its rupee effect on a rollover depends on the actual live spread multiplied by the contract’s lot size. Neither state predicts a future price direction on its own.',
    sections: [
      { heading: 'Reading the MCX futures curve', body: [
        'Compare contracts on the same commodity with different expiries. If the next month is above the near month, the curve is in contango. If it is below, it is in backwardation. The observed curve can reflect financing, storage, seasonality, inventory, delivery mechanics and market positioning.',
        'Do not compare unrelated commodities or mismatched quote units. A curve comparison is meaningful only when the contracts reference the same underlying commodity and the dates are clear.'
      ]},
      { heading: 'Rollover arithmetic', body: [
        'For a long position, selling the near-month and buying a higher-priced next month creates a positive price difference—the live roll cost. If the next month is lower, the difference is a roll benefit. The contract-level rupee amount equals the price spread multiplied by the lot size.',
        'Example: if two otherwise comparable Crude Oil contracts are ₹20/barrel apart, the standard 100-barrel contract has a ₹2,000 spread. This is an arithmetic example, not a typical spread or a recommended trade.'
      ]},
      { heading: 'What the curve cannot tell you', body: [
        'Contango does not automatically mean the commodity will fall, and backwardation does not automatically mean it will rise. The curve reflects prices for different delivery dates, not a simple forecast. Liquidity, contract expiry and event risk remain important.',
        'Before rolling, check the actual bid–ask spreads and available liquidity in both months. The right source for expiry and delivery rules is the current MCX contract specification.'
      ]}
    ],
    faqs: [
      { question: 'What is contango in MCX?', answer: 'Contango is when a later-expiry MCX futures contract trades above a nearer-expiry contract for the same commodity.' },
      { question: 'What is backwardation in MCX?', answer: 'Backwardation is when a later-expiry contract trades below a nearer-expiry contract for the same commodity.' },
      { question: 'How is MCX rollover cost calculated?', answer: 'The live price difference between the next and near contract is multiplied by the contract lot size. The result depends on the actual contracts and time of comparison.' }
    ],
    links: [
      { href: '/learn/mcx-rollover', label: 'MCX futures rollover guide', description: 'Read the operational steps and expiry checks for a rollover.' },
      { href: '/tools/mcx-basis', label: 'MCX basis calculator', description: 'Explore futures-versus-reference price context.' },
      { href: '/markets', label: 'Live MCX markets', description: 'Check current commodity market context before comparing contracts.' }
    ],
    sourceNote: 'Curve definitions are general futures-market concepts; active expiry, price and delivery details must be checked with MCX.'
  }
}

function isGuideKey(value: string): value is GuideKey {
  return Object.prototype.hasOwnProperty.call(GUIDES, value)
}

function loadSnapshotDate() {
  try {
    const snapshot = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/market-snapshot.json'), 'utf8'))
    return snapshot.generatedAtIST ?? REVIEWED
  } catch {
    return REVIEWED
  }
}

export function generateStaticParams() {
  return Object.keys(GUIDES).map(guide => ({ guide }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<{ guide: string }> }): Promise<Metadata> {
  const { guide } = await params
  if (!isGuideKey(guide)) return {}
  const data = GUIDES[guide]
  const canonical = `${BASE}/learn/${guide}`
  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    alternates: { canonical },
    openGraph: { title: `${data.title} | BhaavBrief`, description: data.description, url: canonical, siteName: 'BhaavBrief', type: 'article', locale: 'en_IN' },
    twitter: { card: 'summary_large_image', title: data.title, description: data.description, site: '@bhaavbrief' },
  }
}

export default async function GuidePage({ params }: { params: Promise<{ guide: string }> }) {
  const { guide } = await params
  if (!isGuideKey(guide)) notFound()
  const data = GUIDES[guide]
  const canonical = `${BASE}/learn/${guide}`
  const snapshotDate = loadSnapshotDate()
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: `${BASE}/learn` },
    { '@type': 'ListItem', position: 3, name: data.title },
  ] }
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: data.faqs.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) }
  const article = { '@context': 'https://schema.org', '@type': 'Article', headline: data.title, description: data.description, datePublished: '2026-09-30', dateModified: '2026-09-30', mainEntityOfPage: canonical, author: { '@type': 'Organization', name: 'BhaavBrief Editorial Desk' }, publisher: { '@type': 'Organization', name: 'BhaavBrief', url: BASE } }

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faq) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(article) }} />
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 64px' }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
        <Link href="/" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Home</Link>{' / '}
        <Link href="/learn" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Learn</Link>{' / '}
        <span style={{ color: '#18180F' }}>{data.title}</span>
      </nav>
      <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>{data.eyebrow}</p>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 10 }}>{data.title}</h1>
      <p style={{ fontSize: 12, color: '#8A8A7A', fontFamily: 'var(--font-sans)', marginBottom: 24 }}>Reviewed by BhaavBrief Editorial Desk · {REVIEWED} · Market data timestamp: {snapshotDate}</p>
      <div style={{ background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 28, borderRadius: '0 4px 4px 0', fontSize: 15, lineHeight: 1.75, color: '#18180F' }}><strong>Short answer:</strong> {data.answer}</div>
      {data.sections.map(section => <section key={section.heading}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 500, color: '#18180F', margin: '36px 0 12px' }}>{section.heading}</h2>
        {section.body.map(paragraph => <p key={paragraph} style={{ fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 16 }}>{paragraph}</p>)}
      </section>)}
      <section>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 500, color: '#18180F', margin: '36px 0 12px' }}>Related BhaavBrief tools and guides</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {data.links.map(link => <Link key={link.href} href={link.href} style={{ display: 'block', textDecoration: 'none', border: '1px solid #DDDDD0', padding: '14px 16px', borderRadius: 4 }}><strong style={{ color: '#18180F', fontSize: 14 }}>{link.label}</strong><span style={{ display: 'block', marginTop: 4, color: '#666657', fontSize: 13, lineHeight: 1.5 }}>{link.description}</span></Link>)}
        </div>
      </section>
      <section>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 500, color: '#18180F', margin: '36px 0 12px' }}>Frequently asked questions</h2>
        {data.faqs.map(item => <div key={item.question} style={{ borderTop: '1px solid #DDDDD0', padding: '16px 0' }}><h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#18180F' }}>{item.question}</h3><p style={{ margin: 0, fontSize: 14, color: '#48483A', lineHeight: 1.75 }}>{item.answer}</p></div>)}
      </section>
      <section style={{ marginTop: 32, padding: '16px 20px', background: '#F3F2EC', borderRadius: 4 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: '#18180F', margin: '0 0 8px' }}>Sources and editorial policy</h2>
        <p style={{ fontSize: 13, color: '#48483A', lineHeight: 1.7, margin: '0 0 8px' }}>{data.sourceNote}</p>
        <p style={{ fontSize: 13, color: '#48483A', lineHeight: 1.7, margin: 0 }}>Primary reference: <a href="https://www.mcxindia.com/market-data/contract-information" target="_blank" rel="noreferrer" style={{ color: '#8A4B00' }}>MCX contract information</a>. BhaavBrief is not SEBI registered and this page is educational, not investment advice. See our <Link href="/methodology" style={{ color: '#8A4B00' }}>methodology</Link>.</p>
      </section>
    </main>
  </>
}
