// Shared by the brief visual modules (MarketIsSayingModule, EdgeOfDayCallout)
// — this content only ever uses **bold** markers (confirmed against sampled
// editions), never links or lists, so a full MDX render per row/callout
// isn't warranted.
export default function renderInlineBold(text: string, fontWeight: number = 600) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} style={{ color: 'var(--ink)', fontWeight }}>{part}</strong> : part
  )
}
