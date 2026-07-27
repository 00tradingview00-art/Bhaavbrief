/**
 * lib/black76.ts
 * Black-76 model for MCX options (options on futures, not spot).
 * Black-76 is correct here — not Black-Scholes.
 */

export interface Greeks {
  price: number
  delta: number
  gamma: number
  theta: number
  vega:  number
}

function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const sign = x < 0 ? -1 : 1
  const absX = Math.abs(x) / Math.sqrt(2)
  const t = 1 / (1 + p * absX)
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX))
  return 0.5 * (1 + sign * y)
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

/**
 * Black-76 pricing + Greeks.
 * @param F     Futures price
 * @param K     Strike price
 * @param T     Time to expiry in years
 * @param r     Risk-free rate (RBI repo ~0.065)
 * @param sigma Implied volatility as decimal (0.25 = 25%)
 * @param type  'CE' or 'PE'
 */
export function black76(F: number, K: number, T: number, r: number, sigma: number, type: 'CE' | 'PE'): Greeks {
  if (T <= 0 || sigma <= 0 || F <= 0 || K <= 0) {
    return { price: 0, delta: 0, gamma: 0, theta: 0, vega: 0 }
  }

  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(F / K) + 0.5 * sigma * sigma * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  const df = Math.exp(-r * T)

  let price: number, delta: number

  if (type === 'CE') {
    price = df * (F * normalCDF(d1) - K * normalCDF(d2))
    delta = df * normalCDF(d1)
  } else {
    price = df * (K * normalCDF(-d2) - F * normalCDF(-d1))
    delta = -df * normalCDF(-d1)
  }

  const gamma = (df * normalPDF(d1)) / (F * sigma * sqrtT)
  const vega  = (F * df * normalPDF(d1) * sqrtT) / 100   // per 1% IV move
  // Black-76 theta = −∂C/∂T = −rC − df·F·N'(d1)·σ/(2√T)
  // Expanding rC = r·df·[F·N(d1)−K·N(d2)] gives the full per-day form below.
  const theta = type === 'CE'
    ? ((-df * F * normalPDF(d1) * sigma) / (2 * sqrtT) - r * df * K * normalCDF(d2)  + r * df * F * normalCDF(d1))  / 365
    : ((-df * F * normalPDF(d1) * sigma) / (2 * sqrtT) + r * df * K * normalCDF(-d2) - r * df * F * normalCDF(-d1)) / 365

  return {
    price: Math.max(0, price),
    delta: parseFloat(delta.toFixed(4)),
    gamma: parseFloat(gamma.toFixed(6)),
    theta: parseFloat(theta.toFixed(3)),
    vega:  parseFloat(vega.toFixed(3)),
  }
}

/**
 * Newton-Raphson IV solver.
 *
 * Part 7 (options engine standard): "IV solver failures return null
 * rendered as '—', never 0.1% or clamped extremes." Before this, hitting
 * the sigma clamp during iteration (0.001 or 5) without ever converging
 * was indistinguishable from a real, legitimately extreme IV — both
 * returned a plain number, so a non-convergent solve rendered as a
 * plausible-looking "0.10%" instead of a visible failure. Convergence is
 * now tracked explicitly: only a sigma reached via `|diff| < TOLERANCE`
 * counts as a solved value; hitting MAX_ITER or a dead (near-zero) vega
 * without ever converging returns null instead of the clamped boundary.
 *
 * @returns IV as decimal (0.25 = 25%), or null if unsolvable/non-convergent.
 */
export function calculateIV(
  marketPrice: number,
  F: number,
  K: number,
  T: number,
  r: number,
  type: 'CE' | 'PE',
): number | null {
  if (marketPrice <= 0 || T <= 0) return null

  let sigma = 0.3  // seed
  const MAX_ITER = 100
  const TOLERANCE = 0.01
  let converged = false

  for (let i = 0; i < MAX_ITER; i++) {
    const { price, vega } = black76(F, K, T, r, sigma, type)
    const diff = price - marketPrice

    if (Math.abs(diff) < TOLERANCE) { converged = true; break }
    if (Math.abs(vega) < 1e-10) break // dead vega, can't move further — not a converged solve

    sigma = sigma - diff / (vega * 100)
    if (sigma <= 0.001) sigma = 0.001
    if (sigma > 5) sigma = 5
  }

  if (!converged || isNaN(sigma) || sigma <= 0) return null
  return sigma
}

export interface ChainRowForMaxPain {
  strike: number
  CE: { oi: number }
  PE: { oi: number }
}

/**
 * Max Pain — strike at which option writers lose the least.
 */
export function calculateMaxPain(chain: ChainRowForMaxPain[]): number {
  let minLoss = Infinity
  let maxPainStrike = 0

  chain.forEach(row => {
    let totalLoss = 0
    chain.forEach(inner => {
      if (inner.strike < row.strike) {
        totalLoss += (row.strike - inner.strike) * (inner.CE?.oi || 0)
      }
      if (inner.strike > row.strike) {
        totalLoss += (inner.strike - row.strike) * (inner.PE?.oi || 0)
      }
    })
    if (totalLoss < minLoss) {
      minLoss = totalLoss
      maxPainStrike = row.strike
    }
  })

  return maxPainStrike
}
