const ADVICE_PATTERNS = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\btarget\b/i,
  /\bguaranteed\b/i,
  /will rise/i,
  /will fall/i,
  /strong signal/i,
  /sure shot/i,
  /\bsupport\b/i,
  /\bresistance\b/i,
  /undervalued/i,
  /overvalued/i,
]

const METHODOLOGY_PATTERNS = [
  /calculated as/i,
  /\bformula\b/i,
  /divided by/i,
  /[÷×]/,
  /multiplied/i,
  /-day window/i,
  /day window/i,
  /sample size/i,
  /\bobservations\b/i,
  /data points/i,
  /\bthreshold\b/i,
  /\bcut-off\b/i,
  /pearson/i,
  /correlation coefficient/i,
  /percentile of the last/i,
  /duty of/i,
  /% duty/i,
  /conversion factor/i,
]

export function visualCopyViolations(copy: string): string[] {
  return [...ADVICE_PATTERNS, ...METHODOLOGY_PATTERNS]
    .filter(pattern => pattern.test(copy))
    .map(pattern => pattern.source)
}

export function isVisualCopySafe(copy: string): boolean {
  return visualCopyViolations(copy).length === 0
}
