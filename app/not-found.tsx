import Link from 'next/link'

export const metadata = {
  title: 'Page Not Found',
  robots: 'noindex',
}

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--gold)', marginBottom: 16,
      }}>
        404
      </div>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 28, fontWeight: 500,
        color: 'var(--ink)', margin: '0 0 12px',
      }}>
        Page not found
      </h1>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.7, marginBottom: 32 }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--ink)', color: '#fff',
          padding: '10px 22px', borderRadius: 4,
          fontSize: 15, fontWeight: 500, textDecoration: 'none',
        }}>
          ← Back to home
        </Link>
        <Link href="/briefs" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: '1px solid var(--border)', color: 'var(--ink-2)',
          padding: '10px 20px', borderRadius: 4,
          fontSize: 15, textDecoration: 'none',
        }}>
          Browse briefs
        </Link>
      </div>
    </div>
  )
}
