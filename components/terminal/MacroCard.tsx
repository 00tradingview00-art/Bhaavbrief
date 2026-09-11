interface Props {
  label:   string
  value:   string
  delta?:  { text: string; up: boolean } | null
  note:    string
}

// Small presentational card for a single derived macro figure. Deliberately
// dumb — all the "is this real data" judgment calls live where the caller
// computes its props, not in here.
export default function MacroCard({ label, value, delta, note }: Props) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-3)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
        {value}
      </div>
      {delta && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 2, color: delta.up ? 'var(--up)' : 'var(--down)' }}>
          {delta.text}
        </div>
      )}
      <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 6 }}>{note}</div>
    </div>
  )
}
