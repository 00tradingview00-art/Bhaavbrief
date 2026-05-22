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
    <p>INDIA'S COMMODITY INTELLIGENCE &nbsp;·&nbsp; EDITION ${brief.edition} &nbsp;·&nbsp; ${brief.date.toUpperCase()}</p>
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
    © 2026 BhaavBrief · bhaavbrief.in · Not SEBI registered · For informational purposes only<br>
    <a href="{{{ unsubscribeUrl }}}" style="color:#8A8A7A">Unsubscribe</a>
  </div>
</div>
</body>
</html>`
}
