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

/** Square symmetric matrix with a unit diagonal and values in [-0.9, 0.9]. */
export function previewCorrelationMatrix(size: number): number[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      if (r === c) return 1
      const [a, b] = r < c ? [r, c] : [c, r]
      return Math.round((rand(a * 31 + b * 7 + 3) * 1.8 - 0.9) * 100) / 100
    }),
  )
}
