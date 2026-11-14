// Synthetic stand-in data for the blurred previews behind ProBlurGate.
//
// Non-Pro visitors must never receive real Pro data (anything in a page's
// props is readable in its source, blur or not), but the blurred teaser
// should still look like the real chart. These generators produce plausible,
// deterministic shapes — never derived from real values.

/** Deterministic pseudo-random in [0, 1) — same output for the same seed. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** `n` values oscillating around `center` within roughly ±`amplitude`. */
export function previewWave(n: number, center: number, amplitude: number, seed = 1): number[] {
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin((i + seed) / 3.2) * 0.7 + (rand(seed * 100 + i) - 0.5) * 0.6
    return Math.round((center + wave * amplitude) * 100) / 100
  })
}

/** `n` consecutive ISO dates ending today (UTC) — axis labels only. */
export function previewDates(n: number, end: Date = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end.getTime() - (n - 1 - i) * 24 * 3600 * 1000)
    return d.toISOString().slice(0, 10)
  })
}

/**
 * A plausible correlation matrix — unit diagonal, and (unlike independent
 * per-cell random numbers) actually positive semidefinite, which every real
 * correlation matrix must be. Built as the Gram matrix of deterministic
 * seeded unit vectors rather than per-cell randoms: each pair can still
 * look like a "normal" correlation reading on its own, but the previous
 * version's values were mutually inconsistent in a way no real dataset can
 * produce (negative eigenvalues) — exactly the thing two independent
 * third-party audits flagged as a live data-integrity bug, when it was
 * actually this synthetic placeholder. See lib/correlation.ts for the real
 * (always-valid, because genuinely data-derived) engine.
 */
export function previewCorrelationMatrix(size: number): number[][] {
  const unitVectors = Array.from({ length: size }, (_, i) => {
    const v = Array.from({ length: size }, (_, k) => rand(i * 53 + k * 17 + 11) * 2 - 1)
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
    return v.map(x => x / norm)
  })
  return unitVectors.map((vi, r) =>
    unitVectors.map((vj, c) => {
      if (r === c) return 1
      const dot = vi.reduce((s, x, k) => s + x * vj[k], 0)
      return Math.round(dot * 100) / 100
    }),
  )
}
