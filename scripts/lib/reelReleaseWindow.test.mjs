import { describe, it, expect } from 'vitest'
import { shouldReleaseNow, WINDOW_START_IST, WINDOW_END_IST } from './reelReleaseWindow.mjs'

/** An IST wall-clock time on Mon 5 Oct 2026, as epoch ms. */
const ist = (h, m = 0) => Date.parse('2026-10-05T00:00:00Z') + (h - 5.5) * 3600000 + m * 60000

describe('shouldReleaseNow — window', () => {
  it('releases at the 7:30 PM IST target', () => {
    expect(shouldReleaseNow({ now: ist(19, 30), history: [] }).release).toBe(true)
  })

  it('holds at the times GitHub actually fired the old cron', () => {
    // The six real V3 publish times, in IST — every one must be refused.
    for (const [h, m] of [[23, 49], [23, 50], [1, 57], [0, 27], [0, 34], [3, 6]]) {
      const { release, reason } = shouldReleaseNow({ now: ist(h, m), history: [] })
      expect(release, `${h}:${m} should be refused`).toBe(false)
      expect(reason).toMatch(/outside the/)
    }
  })

  it('holds before the window opens, including the un-lagged cron time', () => {
    expect(shouldReleaseNow({ now: ist(13, 30), history: [] }).release).toBe(false)
    expect(shouldReleaseNow({ now: ist(WINDOW_START_IST, -1), history: [] }).release).toBe(false)
  })

  it('is inclusive at the start and exclusive at the end', () => {
    expect(shouldReleaseNow({ now: ist(WINDOW_START_IST), history: [] }).release).toBe(true)
    expect(shouldReleaseNow({ now: ist(WINDOW_END_IST), history: [] }).release).toBe(false)
    expect(shouldReleaseNow({ now: ist(WINDOW_END_IST) - 60000, history: [] }).release).toBe(true)
  })
})

describe('shouldReleaseNow — one release per IST day', () => {
  const postedToday = [{ file: 'v3/margin-exposure-003', instagram_id: '181', posted_at: new Date(ist(18, 10)).toISOString() }]

  it('refuses a second release once one has published today', () => {
    const { release, reason } = shouldReleaseNow({ now: ist(20), history: postedToday })
    expect(release).toBe(false)
    expect(reason).toMatch(/already published/)
  })

  it('allows a release when the only history entry is from a previous day', () => {
    const yesterday = [{ file: 'v3/old', instagram_id: '180', posted_at: new Date(ist(19) - 24 * 3600000).toISOString() }]
    expect(shouldReleaseNow({ now: ist(19), history: yesterday }).release).toBe(true)
  })

  it('ignores entries that never actually published', () => {
    const unposted = [{ file: 'v3/draft', instagram_id: null, posted_at: new Date(ist(18, 10)).toISOString() }]
    expect(shouldReleaseNow({ now: ist(20), history: unposted }).release).toBe(true)
  })

  it('counts a late-evening IST post against the right day', () => {
    // 21:00 IST on 5 Oct is 15:30 UTC the same day — must not be read as 6 Oct.
    const late = [{ file: 'v3/late', instagram_id: '1', posted_at: new Date(ist(21)).toISOString() }]
    expect(shouldReleaseNow({ now: ist(21, 20), history: late }).reason).toMatch(/already published/)
  })
})

describe('shouldReleaseNow — robustness', () => {
  it('treats malformed or absent history as empty rather than throwing', () => {
    expect(shouldReleaseNow({ now: ist(19), history: null }).release).toBe(true)
    expect(shouldReleaseNow({ now: ist(19) }).release).toBe(true)
    expect(shouldReleaseNow({ now: ist(19), history: [null, {}, { posted_at: 'nonsense' }] }).release).toBe(true)
  })
})
