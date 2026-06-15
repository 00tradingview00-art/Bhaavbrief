const BREVO_API = 'https://api.brevo.com/v3'
const LIST_ID   = Number(process.env.BREVO_LIST_ID ?? 2)

function getApiKey(): string {
  const key = process.env.BREVO_API_KEY
  if (!key) throw new Error('BREVO_API_KEY is not configured')
  return key
}

export async function addSubscriber(email: string, name?: string) {
  const API_KEY = getApiKey()
  const res = await fetch(`${BREVO_API}/contacts`, {
    method: 'POST',
    headers: {
      'api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      attributes: { FIRSTNAME: name ?? '' },
      listIds: [LIST_ID],
      updateEnabled: true,
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.message ?? 'Brevo error')
  }
  return true
}

export async function sendNewsletter({
  subject,
  htmlContent,
  previewText,
}: {
  subject:     string
  htmlContent: string
  previewText: string
}) {
  const API_KEY = getApiKey()
  // Create campaign
  const campaignRes = await fetch(`${BREVO_API}/emailCampaigns`, {
    method: 'POST',
    headers: {
      'api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name:          `BhaavBrief — ${subject}`,
      subject,
      previewText,
      sender:        { name: 'BhaavBrief', email: process.env.SENDER_EMAIL ?? 'brief@bhaavbrief.in' },
      type:          'classic',
      htmlContent,
      recipients:    { listIds: [LIST_ID] },
      scheduledAt:   new Date().toISOString(),
    }),
  })

  if (!campaignRes.ok) {
    const err = await campaignRes.json()
    throw new Error(err?.message ?? 'Failed to create campaign')
  }

  const campaign = await campaignRes.json()
  const id = campaign.id

  // Send immediately
  const sendRes = await fetch(`${BREVO_API}/emailCampaigns/${id}/sendNow`, {
    method: 'POST',
    headers: { 'api-key': API_KEY },
  })

  if (!sendRes.ok) {
    const err = await sendRes.json()
    throw new Error(err?.message ?? 'Failed to send campaign')
  }

  return { campaignId: id }
}

export async function sendWelcomeEmail(email: string, latestBrief?: { title: string; slug: string; edition: number }) {
  const API_KEY = getApiKey()
  const FROM    = process.env.SENDER_EMAIL ?? 'brief@bhaavbrief.in'

  const { getRefCode } = await import('@/lib/referral')
  const refCode = getRefCode(email)
  const refUrl  = `https://bhaavbrief.com/?ref=${refCode}`

  const briefSection = latestBrief ? `
  <div style="background:#F3F2EC;border-left:3px solid #C8720A;padding:16px 20px;margin:24px 0;border-radius:0 4px 4px 0">
    <div style="font-family:monospace;font-size:9px;color:#C8720A;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px">Latest Edition #${latestBrief.edition}</div>
    <div style="font-family:Georgia,serif;font-size:15px;font-weight:600;color:#18180F;margin-bottom:12px;line-height:1.35">${latestBrief.title}</div>
    <a href="https://bhaavbrief.in/briefs/${latestBrief.slug}" style="display:inline-block;background:#18180F;color:#FAFAF6;text-decoration:none;padding:8px 18px;font-family:monospace;font-size:11px;letter-spacing:0.04em">Read now →</a>
  </div>` : ''

  const html = `<!DOCTYPE html>
<html lang="en-IN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;background:#FAFAF6;color:#18180F;margin:0;padding:0">
<div style="max-width:580px;margin:0 auto;padding:40px 24px">

  <div style="border-bottom:3px double #C8C8B8;padding-bottom:16px;margin-bottom:28px">
    <div style="font-size:26px;font-weight:800;letter-spacing:-0.02em">
      Bhaav<span style="color:#C8720A">Brief</span>
    </div>
    <div style="font-size:10px;color:#8A8A7A;font-family:monospace;letter-spacing:0.08em;text-transform:uppercase;margin-top:4px">
      India's First Commodity Intelligence
    </div>
  </div>

  <h1 style="font-size:20px;font-weight:700;line-height:1.3;margin:0 0 16px;font-family:Georgia,serif">
    You're in. Here's what to expect.
  </h1>

  <p style="font-size:15px;line-height:1.75;color:#48483A;font-weight:300;margin:0 0 16px">
    Every weekday at <strong style="color:#18180F">9:30 AM IST</strong>, you'll receive one sharp brief on what's
    driving Indian commodity markets — Gold, Silver, Crude, Copper, Natural Gas.
  </p>

  <p style="font-size:15px;line-height:1.75;color:#48483A;font-weight:300;margin:0 0 16px">
    Not a price dump. A <strong style="color:#18180F">narrative</strong> — the dominant macro story,
    whether it's strengthening or reversing, and what it means for your positions that day.
  </p>

  ${briefSection}

  <div style="background:#FAFAF6;border:0.5px solid #DDDDD0;padding:16px 20px;margin:24px 0;border-radius:4px">
    <div style="display:flex;gap:24px">
      ${[['5 min', 'Daily read'], ['9:30 AM', 'Delivered']].map(([v, l]) =>
        `<div style="text-align:center;flex:1">
          <div style="font-family:Georgia,serif;font-size:18px;font-weight:600;color:#18180F">${v}</div>
          <div style="font-family:monospace;font-size:9px;color:#8A8A7A;letter-spacing:0.07em;text-transform:uppercase;margin-top:3px">${l}</div>
        </div>`
      ).join('')}
    </div>
  </div>

  <div style="background:#F3F2EC;border-left:3px solid #C8720A;padding:16px 20px;margin:24px 0;border-radius:0 4px 4px 0">
    <div style="font-family:monospace;font-size:9px;color:#C8720A;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px">Signal Academy — unlock free access</div>
    <p style="font-size:13px;color:#48483A;font-weight:300;line-height:1.6;margin:0 0 12px">
      Share BhaavBrief with 5 people using your personal link below. When 5 people visit, you unlock all 5 interactive signal simulators — completely free.
    </p>
    <div style="font-family:monospace;font-size:11px;background:#FAFAF6;border:0.5px solid #DDDDD0;padding:8px 12px;border-radius:3px;margin-bottom:12px;word-break:break-all;color:#48483A">
      ${refUrl}
    </div>
    <a href="https://bhaavbrief.com/signal-academy" style="display:inline-block;background:#18180F;color:#FAFAF6;text-decoration:none;padding:8px 18px;font-family:monospace;font-size:11px;letter-spacing:0.04em">Check my progress →</a>
  </div>

  <p style="font-size:13px;line-height:1.7;color:#8A8A7A;margin:24px 0 0">
    Questions? Reply to this email — we read everything.
  </p>

  <div style="border-top:0.5px solid #DDDDD0;margin-top:32px;padding-top:16px;font-size:10px;color:#8A8A7A;font-family:monospace;line-height:1.8">
    © 2026 BhaavBrief · bhaavbrief.in<br>
    For educational and informational purposes only. Not registered with SEBI or any regulatory authority. Nothing here constitutes investment advice, a recommendation, or a solicitation to buy or sell any security or commodity. Past patterns are not indicative of future results. Commodity and equity trading involves substantial risk of loss. Consult a SEBI-registered investment advisor or research analyst before making financial decisions.<br>
    <a href="{{ unsubscribeUrl }}" style="color:#8A8A7A">Unsubscribe</a>
  </div>

</div>
</body>
</html>`

  const res = await fetch(`${BREVO_API}/smtp/email`, {
    method: 'POST',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:  { name: 'BhaavBrief', email: FROM },
      to:      [{ email }],
      subject: 'Welcome to BhaavBrief — your first brief arrives at 9:30 AM',
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    console.warn('[brevo] Welcome email failed:', err?.message)
  }
}

export function briefToHtml(brief: {
  title:    string
  date:     string
  content:  string
  edition:  number
  slug:     string
}): string {
  return `
<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${brief.title}</title>
<style>
  body{font-family:'Georgia',serif;background:#FAFAF6;color:#18180F;margin:0;padding:0}
  .wrap{max-width:620px;margin:0 auto;padding:32px 24px}
  .mast{border-bottom:3px double #C8C8B8;padding-bottom:16px;margin-bottom:24px}
  .mast h1{font-size:28px;font-weight:800;letter-spacing:-0.02em;margin:0 0 4px}
  .mast p{font-size:11px;color:#8A8A7A;font-family:monospace;margin:0;letter-spacing:0.06em}
  h2{font-size:18px;font-weight:700;margin:24px 0 8px;border-left:3px solid #C8720A;padding-left:12px}
  p{font-size:15px;line-height:1.75;color:#48483A;font-weight:300;margin:0 0 12px}
  .tag{display:inline-block;font-size:10px;font-family:monospace;padding:2px 8px;border:0.5px solid;margin-right:6px;margin-bottom:12px}
  .tag-watch{background:#FFF7E0;color:#996600;border-color:#D4A830}
  .tag-bull{background:#EAF5EE;color:#1E6630;border-color:#5AAA70}
  .tag-bear{background:#FDF0F0;color:#991818;border-color:#D07070}
  .footer{border-top:0.5px solid #DDDDD0;margin-top:32px;padding-top:16px;font-size:11px;color:#8A8A7A;font-family:monospace}
  .cta{display:block;background:#C8720A;color:#FAFAF6;text-decoration:none;padding:12px 24px;text-align:center;font-family:monospace;font-size:12px;letter-spacing:0.04em;margin:24px 0}
</style>
</head>
<body>
<div class="wrap">
  <div class="mast">
    <h1>BhaavBrief</h1>
    <p>INDIA'S FIRST COMMODITY INTELLIGENCE &nbsp;·&nbsp; EDITION ${brief.edition} &nbsp;·&nbsp; ${brief.date.toUpperCase()}</p>
  </div>
  ${brief.content
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<p>— $1</p>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hp])/gm, '<p>')
  }
  <a class="cta" href="https://bhaavbrief.in/briefs/${brief.slug}">Read full edition on BhaavBrief →</a>
  <div class="footer">
    © 2026 BhaavBrief · bhaavbrief.in · Not SEBI registered · Educational and informational purposes only · Past patterns not indicative of future results<br>
    <a href="{{{ unsubscribeUrl }}}" style="color:#8A8A7A">Unsubscribe</a>
  </div>
</div>
</body>
</html>`
}
