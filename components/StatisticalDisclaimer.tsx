export default function StatisticalDisclaimer({ style }: { style?: React.CSSProperties }) {
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
      Statistical information, not a trading recommendation.
    </p>
  )
}
