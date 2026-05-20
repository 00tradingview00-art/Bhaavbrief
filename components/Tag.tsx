const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  energy:  { bg: '#FFF3E0', color: '#B45309' },
  metals:  { bg: '#F0F4FF', color: '#2B4FC7' },
  macro:   { bg: '#F3F0FF', color: '#6B21A8' },
  agri:    { bg: '#EFFAF4', color: '#166534' },
  default: { bg: '#F3F0E8', color: '#7A7668' },
}

interface TagProps {
  type?: string
  children: React.ReactNode
}

export default function Tag({ type = 'default', children }: TagProps) {
  const style = TAG_STYLES[type.toLowerCase()] ?? TAG_STYLES.default
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 9px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.2px',
      background: style.bg,
      color: style.color,
    }}>
      {children}
    </span>
  )
}
