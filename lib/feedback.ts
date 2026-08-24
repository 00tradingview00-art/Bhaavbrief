export async function submitFeedback(data: unknown): Promise<void> {
  const url = process.env.GOOGLE_FEEDBACK_SCRIPT_URL
  if (!url) throw new Error('Feedback endpoint not configured')

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Feedback submission failed')
}
