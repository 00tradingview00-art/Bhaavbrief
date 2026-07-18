function renderInlineBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} style={{ color: 'var(--ink)', fontWeight: 700 }}>{part}</strong> : part
  )
}

// Part 12 §12.4.5 "Edge of the Day" callout. The doc's spec calls for a
// progress bar showing proximity to a key level, but extracting "current
// price" vs "level" from freeform prose isn't reliable: verified against
// real editions, some Edge-of-Day text mentions two numbers that are a
// support level and an unrelated downside target, not (current, level) —
// naively taking "the first two $/₹ figures" as that pair produced a
// confident-looking but fabricated percentage. Rather than risk a
// misleading bar, this always renders the text-only callout.
export default function EdgeOfDayCallout({ text, tomorrow }: { text: string; tomorrow: string | null }) {
  return (
    <div style={{
      marginBottom: '1.5rem', padding: '16px 18px',
      background: 'var(--gold-pale)', border: '1px solid rgba(181,134,42,0.3)', borderRadius: 8,
    }}>
      <h2 style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--gold)', margin: '0 0 8px',
      }}>
        Edge of the Day
      </h2>
      <p style={{ fontSize: 15, fontFamily: 'var(--font-serif)', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.5, margin: tomorrow ? '0 0 10px' : 0 }}>
        {renderInlineBold(text)}
      </p>
      {tomorrow && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(181,134,42,0.2)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-dark)', marginBottom: 6 }}>
            Tomorrow
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
            {renderInlineBold(tomorrow)}
          </p>
        </div>
      )}
    </div>
  )
}
