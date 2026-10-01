import { IMPORT_REFERENCE_COPY, type ImportReferenceView } from '@/lib/importReference'

const SIDE_COLOUR = { 1: 'var(--up)', [-1]: 'var(--down)', 0: 'var(--ink-4)' } as const

export default function ImportReferencePosition({ view, asOf }: { view: ImportReferenceView; asOf?: string | null }) {
  return <div style={{ background: 'var(--surface-2, #f8f7f4)', borderRadius: 6, margin: '0 0 0.85rem', padding: '10px 12px' }}>
    <div style={{ display: 'flex', fontSize: 10, fontWeight: 700, justifyContent: 'space-between', letterSpacing: '.06em', marginBottom: 8, textTransform: 'uppercase', color: 'var(--ink-3)' }}>
      <span>{IMPORT_REFERENCE_COPY.title}</span>
      {asOf && <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: 'none' }}>as of {asOf}</span>}
    </div>
    <div role="img" aria-label={view.ariaLabel} style={{ height: 14, position: 'relative' }}>
      <span style={{ background: 'var(--border, #e5e7eb)', height: 4, left: 0, position: 'absolute', right: 0, top: 5 }} />
      <span style={{ background: 'var(--ink-3)', height: 14, left: '50%', position: 'absolute', top: 0, width: 2 }} />
      <span style={{ background: 'var(--gold)', border: '2px solid var(--surface, #fff)', borderRadius: '50%', height: 14, left: `calc(${view.position}% - 7px)`, position: 'absolute', top: 0, width: 14 }} />
    </div>
    <div aria-hidden="true" style={{ color: 'var(--ink-4)', display: 'flex', fontSize: 10, justifyContent: 'space-between', marginTop: 4 }}>
      <span>{IMPORT_REFERENCE_COPY.discount}</span><span>{IMPORT_REFERENCE_COPY.premium}</span>
    </div>
    <p style={{ color: 'var(--ink-2)', fontSize: 12.5, lineHeight: 1.45, margin: '8px 0 0' }}>
      <strong>{view.sentence}</strong> {IMPORT_REFERENCE_COPY.boundary}
    </p>
    {view.recent.length > 1 && <div style={{ alignItems: 'center', display: 'flex', gap: 8, marginTop: 8 }}>
      <span style={{ color: 'var(--ink-4)', fontSize: 10 }}>{IMPORT_REFERENCE_COPY.recentLabel}</span>
      <span aria-hidden="true" style={{ display: 'flex', gap: 2, height: 14, position: 'relative' }}>
        {view.recent.map((s, i) => <span key={i} style={{ alignSelf: s > 0 ? 'flex-start' : s < 0 ? 'flex-end' : 'center', background: SIDE_COLOUR[s], borderRadius: '50%', height: 4, width: 4 }} />)}
      </span>
    </div>}
  </div>
}
