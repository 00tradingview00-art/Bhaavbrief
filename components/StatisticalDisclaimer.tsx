// Part 12 §12.11 — genericized with a `text` prop so the same component can
// also carry the consolidated disclaimer copy, without breaking existing
// call sites that want the shorter statistical-only phrasing.
export default function StatisticalDisclaimer({ style, text }: { style?: React.CSSProperties; text?: string }) {
  return (
    <p style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--ink-4)',
      letterSpacing: '0.02em',
      lineHeight: 1.5,
      margin: '8px 0 0',
      ...style,
    }}>
      {text ?? 'Statistical information, not a trading recommendation.'}
    </p>
  )
}
