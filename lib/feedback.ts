const BREVO_API = 'https://api.brevo.com/v3'

type FeedbackPayload = {
  userType?:     string
  duration?:     string
  r1?:           number
  r2?:           number
  r3?:           number
  r4?:           number
  sections?:     string[]
  suggestion?:   string
  testimonial?:  string
  permission?:   string
  displayName?:  string
  displayRole?:  string
  email?:        string
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function row(label: string, value: string): string {
  if (!value) return ''
  return `<tr><td style="padding:6px 12px 6px 0;color:#8A8A7A;font-family:monospace;font-size:11px;vertical-align:top;white-space:nowrap">${esc(label)}</td><td style="padding:6px 0;color:#18180F;font-size:14px">${esc(value)}</td></tr>`
}

function feedbackToHtml(f: FeedbackPayload): string {
  const stars = (n?: number) => n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '—'
  return `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;background:#FAFAF6;color:#18180F;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;padding:32px 24px">
  <div style="border-bottom:3px double #C8C8B8;padding-bottom:12px;margin-bottom:20px">
    <div style="font-size:20px;font-weight:800">Bhaav<span style="color:#C8720A">Brief</span> — New Feedback</div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    ${row('User type', f.userType ?? '')}
    ${row('Reading for', f.duration ?? '')}
    ${row('Sections used', (f.sections ?? []).join(', '))}
    ${row('Explains why', stars(f.r1))}
    ${row('9:30 AM timing', stars(f.r2))}
    ${row('Event calendar', stars(f.r3))}
    ${row('Overall value', stars(f.r4))}
    ${row('Suggestion', f.suggestion ?? '')}
    ${row('Permission', f.permission ?? '')}
    ${row('Display name', f.displayName ?? '')}
    ${row('Display role', f.displayRole ?? '')}
    ${row('Email', f.email ?? '')}
  </table>
  ${f.testimonial ? `<div style="padding:16px 20px;background:#F3F2EC;border-left:3px solid #C8720A;margin-bottom:8px">
    <p style="font-size:15px;line-height:1.6;font-style:italic;margin:0">&quot;${esc(f.testimonial)}&quot;</p>
  </div>` : ''}
</div>
</body></html>`
}

export async function submitFeedback(data: unknown): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('Feedback endpoint not configured')

  const f = (data ?? {}) as FeedbackPayload
  const from = process.env.SENDER_EMAIL ?? 'brief@bhaavbrief.in'

  const res = await fetch(`${BREVO_API}/smtp/email`, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:  { name: 'BhaavBrief Feedback', email: from },
      // brief@bhaavbrief.in has MX records but no mailbox actually provisioned
      // behind it — sending there hard-bounces (550 5.1.1, confirmed in Brevo's
      // transactional log). 00tradingview00@gmail.com is the address this is
      // meant to reach and already receives mail reliably from this sender.
      to:      [{ email: '00tradingview00@gmail.com' }],
      ...(f.email ? { replyTo: { email: f.email } } : {}),
      subject: `New feedback — ${f.userType ?? 'Unknown user type'}`,
      htmlContent: feedbackToHtml(f),
    }),
  })

  if (!res.ok) throw new Error('Feedback submission failed')
}
