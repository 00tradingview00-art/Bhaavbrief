/**
 * lib/vix.ts
 * MCX iVIX + AAV (Annualized Actual Volatility) computation.
 *
 * MCX iVIX: India's equivalent of OVX (crude), GVZ (gold), VXSLV (silver).
 * Computed using the CBOE variance-swap formula applied to MCX option chain data.
 *
 * MCX AAV: Realized historical volatility over rolling windows (5/10/20/40/60 days).
 * Formula confirmed against MCX official AAV data file — uses √252 annualization.
 */

export interface ChainRowForVIX {
  strike: number
  CE: { ltp: number; oi: number }
  PE: { ltp: number; oi: number }
}

export interface AAVResult {
  '5d':  number | null
  '10d': number | null
  '20d': number | null
  '40d': number | null
  '60d': number | null
}

/**
 * Compute MCX iVIX using the CBOE VIX model-free formula (single-expiry version).
 *
 * σ² = (2/T) × Σᵢ [ΔKᵢ/Kᵢ²] × e^(rT) × Q(Kᵢ)  −  (1/T) × [F/K₀ − 1]²
 *
 * Two-expiry interpolation is not done here (requires fetching a second expiry chain);
 * for the displayed single expiry, this gives the variance swap rate = implied vol surface.
 *
 * @param chain       Option chain rows sorted by strike ascending
 * @param futurePrice MCX front-month futures LTP
 * @param T           Time to expiry in years
 * @param r           Risk-free rate (RBI repo, e.g. 0.065)
 * @returns           iVIX value (e.g. 26.3 means 26.3%), or null if insufficient data
 */
export function computeIVIX(
  chain: ChainRowForVIX[],
  futurePrice: number,
  T: number,
  r: number,
): number | null {
  if (!chain.length || futurePrice <= 0 || T <= 0) return null

  // Step 1: Find K₀ = largest strike ≤ futurePrice
  const sorted = [...chain].sort((a, b) => a.strike - b.strike)
  const k0Row = [...sorted].reverse().find(r => r.strike <= futurePrice) ?? sorted[0]
  const K0 = k0Row.strike

  // Step 2: Build selected strike list with option prices Q(Kᵢ)
  // OTM puts: strikes < K₀ (walk down, stop at 2 consecutive zero bids)
  // OTM calls: strikes > K₀ (walk up, stop at 2 consecutive zero bids)
  // At K₀: midpoint of CE and PE

  interface SelectedStrike { K: number; Q: number }
  const selected: SelectedStrike[] = []

  // ATM strike — average of CE and PE
  const atmCE = k0Row.CE.ltp
  const atmPE = k0Row.PE.ltp
  selected.push({ K: K0, Q: (atmCE + atmPE) / 2 })

  // OTM puts — below K₀
  const putsBelow = sorted.filter(r => r.strike < K0).reverse()  // descending from K₀
  let zeroCount = 0
  for (const row of putsBelow) {
    const q = row.PE.ltp
    if (q <= 0 && row.PE.oi <= 0) {
      zeroCount++
      if (zeroCount >= 2) break
    } else {
      zeroCount = 0
    }
    if (q > 0) selected.push({ K: row.strike, Q: q })
  }

  // OTM calls — above K₀
  const callsAbove = sorted.filter(r => r.strike > K0)  // ascending from K₀
  zeroCount = 0
  for (const row of callsAbove) {
    const q = row.CE.ltp
    if (q <= 0 && row.CE.oi <= 0) {
      zeroCount++
      if (zeroCount >= 2) break
    } else {
      zeroCount = 0
    }
    if (q > 0) selected.push({ K: row.strike, Q: q })
  }

  if (selected.length < 3) return null

  // Sort by strike for ΔK computation
  selected.sort((a, b) => a.K - b.K)

  // Step 3: Compute ΔKᵢ for each strike
  // ΔK = (K_{i+1} - K_{i-1}) / 2
  // Boundary: ΔK = distance to adjacent strike only
  const n = selected.length
  const df = Math.exp(r * T)

  let sum = 0
  for (let i = 0; i < n; i++) {
    const K = selected[i].K
    const Q = selected[i].Q

    let deltaK: number
    if (i === 0)     deltaK = selected[1].K - selected[0].K
    else if (i === n - 1) deltaK = selected[n - 1].K - selected[n - 2].K
    else             deltaK = (selected[i + 1].K - selected[i - 1].K) / 2

    sum += (deltaK / (K * K)) * df * Q
  }

  // Step 4: σ² = (2/T) × sum - (1/T) × [F/K₀ - 1]²
  const sigma2 = (2 / T) * sum - (1 / T) * Math.pow(futurePrice / K0 - 1, 2)

  if (sigma2 <= 0) return null
  return parseFloat((100 * Math.sqrt(sigma2)).toFixed(2))
}

// Kite's continuous-futures history (continuous=1) splices successive MCX
// contracts together WITHOUT back-adjusting price at rollover — confirmed by
// pulling raw NATURALGAS candles, which show real single-day jumps of +25.7%
// / -42.7% / -27.1% clustered around a contract roll. No MCX-listed commodity
// here plausibly moves that much in one session; these are splice artifacts,
// not real returns. Left unclamped, one such day inflates every rolling
// window that contains it (e.g. computeRollingAAV showed 139%/249% "realized
// vol" at the point of a NatGas rollover). Winsorize any single-day log
// return beyond ±12% before it enters the variance calculation — affects
// only the volatility estimate, never displayed prices.
const MAX_DAILY_LOG_RETURN = Math.log(1.12)
const clampReturn = (r: number) => Math.max(-MAX_DAILY_LOG_RETURN, Math.min(MAX_DAILY_LOG_RETURN, r))

/**
 * Compute MCX AAV (Annualized Actual Volatility) for all standard windows.
 * Formula: σ_daily = std_dev(log_returns, ddof=1); AAV = σ_daily × √252 × 100
 * Matches MCX official AAV publication (√252 annualization confirmed).
 *
 * @param closes  Daily close prices, most recent LAST (ascending date order)
 *                Needs at least 61 values to compute all 5 windows.
 * @returns       AAV for each window in %, or null if insufficient data
 */
export function computeAAV(closes: number[]): AAVResult {
  function aav(n: number): number | null {
    // Need n+1 closes to get n returns
    if (closes.length < n + 1) return null
    const slice = closes.slice(-(n + 1))   // last n+1 closes
    const returns: number[] = []
    for (let i = 1; i < slice.length; i++) {
      if (slice[i - 1] <= 0) return null
      returns.push(clampReturn(Math.log(slice[i] / slice[i - 1])))
    }
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length
    const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (returns.length - 1)
    const sigma = Math.sqrt(variance)
    return parseFloat((sigma * Math.sqrt(252) * 100).toFixed(2))
  }

  return {
    '5d':  aav(5),
    '10d': aav(10),
    '20d': aav(20),
    '40d': aav(40),
    '60d': aav(60),
  }
}

export interface AAVSeriesPoint { date: string; aav: number }

/**
 * Rolling AAV (Realized Volatility) time series — same formula as computeAAV's
 * single-point calculation, but computed for every date in the series instead
 * of only the most recent one. Used to chart historical realized vol, which
 * (unlike implied vol) can be reconstructed for any past date from ordinary
 * daily closes — no snapshot pipeline required.
 *
 * @param closes  Daily closes, ascending date order (oldest first)
 * @param window  Rolling window size in trading days (default 20, matching AAV 20d)
 * @returns       One point per date once `window` trading days of history exist
 */
export function computeRollingAAV(
  closes: { date: string; price: number }[],
  window = 20,
): AAVSeriesPoint[] {
  const points: AAVSeriesPoint[] = []

  for (let end = window; end < closes.length; end++) {
    const slice = closes.slice(end - window, end + 1)   // window+1 closes → window returns
    const returns: number[] = []
    let valid = true
    for (let i = 1; i < slice.length; i++) {
      if (slice[i - 1].price <= 0) { valid = false; break }
      returns.push(clampReturn(Math.log(slice[i].price / slice[i - 1].price)))
    }
    if (!valid) continue

    const mean     = returns.reduce((s, r) => s + r, 0) / returns.length
    const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (returns.length - 1)
    const sigma    = Math.sqrt(variance)
    const aav      = parseFloat((sigma * Math.sqrt(252) * 100).toFixed(2))

    points.push({ date: closes[end].date, aav })
  }

  return points
}
