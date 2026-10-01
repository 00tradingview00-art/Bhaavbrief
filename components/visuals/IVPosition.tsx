type Props = {
  value: number
  label: string
  description: string
}

export default function IVPosition({ value, label, description }: Props) {
  const position = Math.max(0, Math.min(100, value))
  return <div aria-label={`${label}: ${value.toFixed(0)}`} style={{ marginTop: 10, maxWidth: 320 }}>
    <div style={{ display: 'flex', fontSize: 10, justifyContent: 'space-between', color: 'var(--ink-4)', marginBottom: 5 }}><span>Low for this market</span><span>High for this market</span></div>
    <div style={{ background: 'var(--border)', height: 6, position: 'relative' }}>
      <span style={{ background: 'var(--gold)', border: '2px solid var(--surface)', borderRadius: '50%', height: 14, left: `calc(${position}% - 7px)`, position: 'absolute', top: -4, width: 14 }} />
    </div>
    <p style={{ color: 'var(--ink-3)', fontSize: 12, lineHeight: 1.45, margin: '8px 0 0' }}>{description}</p>
  </div>
}
