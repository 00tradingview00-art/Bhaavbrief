'use client'

import { useState } from 'react'

const C = {
  bg: 'var(--surface-2)', card: 'var(--surface)', cardAlt: 'var(--surface-3)', border: 'var(--border)',
  accent: 'var(--gold)', accentDim: 'rgba(181,134,42,0.12)', accentFaint: 'rgba(181,134,42,0.06)',
  text: 'var(--ink)', textSub: 'var(--ink-3)', textMuted: 'var(--ink-4)',
  success: '#10B981', successDim: 'rgba(16,185,129,0.12)',
}

const STEP_LABELS = ['Your profile', 'Your ratings', 'Your voice']
const USER_TYPES = ['MCX trader (active/positional)', 'Commodity investor', 'Business or merchant', 'Learning about markets', 'Other']
const DURATIONS = ['Under a month', '1–3 months', '3–6 months', '6 months or more']
const SECTIONS = ['Daily briefs', 'Live markets', 'Options tool', 'Event calendar', 'News feed', 'Learn']
const STAR_ROWS = [
  { key: 'r1', label: 'Explains WHY commodities move — not just WHAT moved', sub: 'Context, cause, macro linkage' },
  { key: 'r2', label: '9:30 AM timing — arrives before the session finds direction', sub: "Useful when it lands, not after you've already acted" },
  { key: 'r3', label: 'Event calendar — helps plan around EIA, FOMC, RBI MPC', sub: 'Anticipating rather than reacting' },
  { key: 'r4', label: 'Overall value to my trading or investment process', sub: 'Would I miss it if it stopped?' },
] as const

type RatingKey = typeof STAR_ROWS[number]['key']

type FormState = {
  userType: string
  duration: string
  r1: number
  r2: number
  r3: number
  r4: number
  sections: string[]
  suggestion: string
  testimonial: string
  permission: '' | 'named' | 'anonymous' | 'no'
  displayName: string
  displayRole: string
  email: string
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: '6px', cursor: 'pointer',
      border: `1px solid ${selected ? C.accent : C.border}`,
      background: selected ? C.accentDim : C.cardAlt,
      color: selected ? C.accent : C.textSub,
      fontSize: '13px', fontWeight: selected ? '500' : '400',
      fontFamily: 'var(--font-sans)', transition: 'all .15s',
    }}>{label}</button>
  )
}

function StarRow({ value, onChange, label, sub }: { value: number; onChange: (v: number) => void; label: string; sub: string }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: '16px', padding: '13px 16px', borderRadius: '8px',
      border: `1px solid ${C.border}`, background: C.cardAlt, marginBottom: '10px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: C.text, fontWeight: '500', lineHeight: '1.4' }}>{label}</div>
        <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <span key={s}
            onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
            onClick={() => onChange(s)}
            style={{
              fontSize: '22px', cursor: 'pointer', lineHeight: 1, userSelect: 'none',
              color: s <= (hover || value) ? C.accent : C.border,
              transition: 'color .1s',
            }}>★</span>
        ))}
      </div>
    </div>
  )
}

function RadioOpt({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '11px 16px', borderRadius: '8px', cursor: 'pointer',
      border: `1px solid ${selected ? C.accent : C.border}`,
      background: selected ? C.accentDim : C.cardAlt,
      color: selected ? C.accent : C.textSub,
      fontSize: '13px', textAlign: 'left', fontFamily: 'var(--font-sans)',
      display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px',
      transition: 'all .15s',
    }}>
      <span style={{
        width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${selected ? C.accent : C.textMuted}`,
        background: selected ? C.accent : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#000' }} />}
      </span>
      {label}
    </button>
  )
}

const label = (text: string) => (
  <span style={{
    display: 'block', fontSize: '11px', fontWeight: '500', color: C.textMuted,
    letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '10px',
  }}>{text}</span>
)

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px', background: C.cardAlt,
  border: `1px solid ${C.border}`, borderRadius: '8px',
  color: C.text, fontSize: '14px', fontFamily: 'var(--font-sans)',
  outline: 'none', lineHeight: '1.6', boxSizing: 'border-box',
}

export default function FeedbackForm() {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState<FormState>({
    userType: '', duration: '', r1: 0, r2: 0, r3: 0, r4: 0,
    sections: [], suggestion: '', testimonial: '',
    permission: '', displayName: '', displayRole: '', email: '',
  })

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF(p => ({ ...p, [k]: v }))
  const toggleSection = (s: string) => setF(p => ({
    ...p,
    sections: p.sections.includes(s) ? p.sections.filter(x => x !== s) : [...p.sections, s],
  }))
  const setRating = (k: RatingKey, v: number) => setF(p => ({ ...p, [k]: v }))

  // Every field is optional — someone using this purely as a contact channel
  // (e.g. a privacy/data-deletion request) shouldn't be blocked by ratings or
  // a testimonial they have no reason to fill in.
  const next = async () => {
    if (sending) return
    if (step < 2) { setStep(s => s + 1); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      if (!res.ok) throw new Error()
      setDone(true)
    } catch {
      setError("Couldn't submit — please try again in a moment.")
    } finally {
      setSending(false)
    }
  }

  if (done) {
    const showQuote = f.testimonial && f.permission !== 'no'
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '40px', maxWidth: '520px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: C.successDim, color: C.success, fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>✓</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 500, color: C.text, marginBottom: '10px' }}>Received. Thank you.</h2>
          <p style={{ fontSize: '14px', color: C.textSub, lineHeight: '1.6', marginBottom: '24px' }}>
            {showQuote ? "We'll feature your response on bhaavbrief.in soon." : 'Your feedback will shape what we build next.'}
          </p>
          {showQuote && (
            <div style={{
              padding: '16px 20px', background: C.accentFaint,
              borderTop: `1px solid ${C.border}`,
              borderRight: `1px solid ${C.border}`,
              borderBottom: `1px solid ${C.border}`,
              borderLeft: `3px solid ${C.accent}`,
              borderRadius: '8px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
              textAlign: 'left',
            }}>
              <p style={{ fontSize: '14px', color: C.text, lineHeight: '1.6', fontStyle: 'italic', margin: 0 }}>&quot;{f.testimonial}&quot;</p>
              {f.permission === 'named' && f.displayName && (
                <p style={{ fontSize: '12px', color: C.textSub, marginTop: '10px', marginBottom: 0 }}>
                  — {f.displayName}{f.displayRole ? `, ${f.displayRole}` : ''}
                </p>
              )}
            </div>
          )}
          <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '24px' }}>BhaavBrief · Daily MCX Intelligence</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '36px', maxWidth: '540px', width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: 500, color: C.text, letterSpacing: '-.02em' }}>BhaavBrief</span>
            <span style={{ fontSize: '10px', color: C.textMuted, padding: '2px 7px', border: `1px solid ${C.border}`, borderRadius: '4px', letterSpacing: '.07em', textTransform: 'uppercase' }}>Feedback</span>
          </div>
          <span style={{ fontSize: '12px', color: C.textMuted }}>{step + 1} / 3</span>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              flex: 1, height: '2px', borderRadius: '2px',
              background: i <= step ? C.accent : C.border,
              opacity: i < step ? 0.4 : 1, transition: 'all .3s',
            }} />
          ))}
        </div>
        <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: C.accent, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '24px' }}>
          {STEP_LABELS[step]}
        </span>

        {/* Step 0 */}
        {step === 0 && <>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 500, color: C.text, marginBottom: '6px' }}>Who are you?</h3>
          <p style={{ fontSize: '14px', color: C.textSub, lineHeight: '1.5', marginBottom: '24px' }}>Two quick questions so your feedback lands in the right part of the product.</p>
          <div style={{ marginBottom: '24px' }}>
            {label('I primarily use BhaavBrief as a')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {USER_TYPES.map(t => <Chip key={t} label={t} selected={f.userType === t} onClick={() => set('userType', t)} />)}
            </div>
          </div>
          <div>
            {label("I've been reading for")}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {DURATIONS.map(d => <Chip key={d} label={d} selected={f.duration === d} onClick={() => set('duration', d)} />)}
            </div>
          </div>
        </>}

        {/* Step 1 */}
        {step === 1 && <>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 500, color: C.text, marginBottom: '6px' }}>Rate the product</h3>
          <p style={{ fontSize: '14px', color: C.textSub, lineHeight: '1.5', marginBottom: '20px' }}>Be honest. One star is valid feedback too — or skip straight to the next step.</p>
          <div style={{ marginBottom: '20px' }}>
            {STAR_ROWS.map(r => <StarRow key={r.key} value={f[r.key]} onChange={v => setRating(r.key, v)} label={r.label} sub={r.sub} />)}
          </div>
          <div style={{ marginBottom: '20px' }}>
            {label('Sections I actually open')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SECTIONS.map(s => <Chip key={s} label={s} selected={f.sections.includes(s)} onClick={() => toggleSection(s)} />)}
            </div>
          </div>
          <div>
            {label('What would make this more useful? (optional)')}
            <textarea rows={3} value={f.suggestion} onChange={e => set('suggestion', e.target.value)}
              placeholder="A missing commodity, coverage gap, or feature that would change how you use it…"
              style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>
        </>}

        {/* Step 2 */}
        {step === 2 && <>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 500, color: C.text, marginBottom: '6px' }}>In your own words</h3>
          <p style={{ fontSize: '14px', color: C.textSub, lineHeight: '1.5', marginBottom: '24px' }}>This one question shapes how others find BhaavBrief. Specific beats generic every time.</p>
          <div style={{ marginBottom: '24px' }}>
            {label('In one sentence, what does BhaavBrief do for you? (optional)')}
            <textarea rows={3} value={f.testimonial} onChange={e => set('testimonial', e.target.value)}
              placeholder="e.g. I open BhaavBrief before my terminal every morning — it gives me the why before the market gives me the what."
              style={{ ...fieldStyle, resize: 'vertical', borderColor: f.testimonial.trim().length > 10 ? C.accent : C.border }} />
            <span style={{ fontSize: '11px', color: C.textMuted, marginTop: '5px', display: 'block' }}>Specific, concrete, in your own voice. This is the one that gets featured.</span>
          </div>
          <div style={{ marginBottom: f.permission === 'named' ? '16px' : '0' }}>
            {label('Can we feature this on bhaavbrief.in?')}
            <RadioOpt label="Yes — use my name and how I describe myself" selected={f.permission === 'named'} onClick={() => set('permission', 'named')} />
            <RadioOpt label="Yes — but keep me anonymous" selected={f.permission === 'anonymous'} onClick={() => set('permission', 'anonymous')} />
            <RadioOpt label="No — keep this private" selected={f.permission === 'no'} onClick={() => set('permission', 'no')} />
          </div>
          {f.permission === 'named' && (
            <div style={{ padding: '16px', background: C.accentFaint, border: `1px solid ${C.border}`, borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                {label('Your name')}
                <input type="text" value={f.displayName} onChange={e => set('displayName', e.target.value)}
                  placeholder="Rahul Sharma" style={{ ...fieldStyle, height: '40px', resize: 'none', padding: '0 12px' }} />
              </div>
              <div>
                {label('How should we describe you?')}
                <input type="text" value={f.displayRole} onChange={e => set('displayRole', e.target.value)}
                  placeholder="MCX Gold trader, Mumbai" style={{ ...fieldStyle, height: '40px', resize: 'none', padding: '0 12px' }} />
              </div>
            </div>
          )}
          <div>
            {label('Email (optional)')}
            <input type="email" value={f.email} onChange={e => set('email', e.target.value)}
              placeholder="For follow-up on your feedback" style={{ ...fieldStyle, height: '40px', resize: 'none', padding: '0 12px' }} />
          </div>
        </>}

        {error && (
          <p style={{ fontSize: '13px', color: '#B3261E', marginTop: '16px' }}>{error}</p>
        )}

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', paddingTop: '20px', borderTop: `1px solid ${C.border}` }}>
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: 'none', color: C.textSub, fontSize: '13px', cursor: 'pointer' }}>← Back</button>
            : <div />}
          <button onClick={next} disabled={sending} style={{
            padding: '10px 22px', borderRadius: '8px', border: 'none',
            background: !sending ? C.accent : C.border,
            color: !sending ? '#080A0C' : C.textMuted,
            fontSize: '13px', fontWeight: 600, cursor: !sending ? 'pointer' : 'default',
            fontFamily: 'var(--font-sans)', transition: 'all .15s',
          }}>
            {step < 2 ? 'Continue →' : sending ? 'Sending…' : 'Submit feedback →'}
          </button>
        </div>
      </div>
    </div>
  )
}
