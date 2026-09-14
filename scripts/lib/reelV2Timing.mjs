export function assertNarrationFits(voiceSeconds, videoSeconds) {
  if (![voiceSeconds, videoSeconds].every(n => Number.isFinite(n) && n > 0)) {
    throw new Error('Narration/video duration must be finite and positive')
  }
  if (voiceSeconds > videoSeconds - 0.15) {
    throw new Error(`Narration is ${voiceSeconds.toFixed(2)}s for a ${videoSeconds.toFixed(2)}s video. Shorten the script or re-render a longer visual; never trim the spoken ending.`)
  }
}
