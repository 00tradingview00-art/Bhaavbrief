// Shared loading indicator — the design system had none before this; the two
// existing skeletons (components/news/NewsFeed.tsx, components/mcx/OptionChain.tsx)
// were each hand-rolled locally with no shared primitive to reuse.

const SIZES = {
  sm: 16,
  md: 24,
  lg: 32,
} as const

interface LoadingSpinnerProps {
  size?: keyof typeof SIZES
  label?: string
}

export default function LoadingSpinner({ size = 'md', label = 'Loading' }: LoadingSpinnerProps) {
  const px = SIZES[size]
  return (
    <span
      role="status"
      aria-label={label}
      className="bb-spinner"
      style={{
        display: 'inline-block',
        width: px,
        height: px,
        borderRadius: '50%',
        border: '2px solid var(--border)',
        borderTopColor: 'var(--gold)',
      }}
    />
  )
}

// Full-page centered variant for app/*/loading.tsx route files.
export function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        padding: 'var(--space-8)',
      }}
    >
      <LoadingSpinner size="lg" label={label} />
    </main>
  )
}
