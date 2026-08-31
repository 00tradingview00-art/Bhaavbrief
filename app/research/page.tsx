import { redirect } from 'next/navigation'

// Pro Research articles are now folded into the Feed (/news) — headline visible,
// full content locked behind Pro on the existing /research/[slug] paywall. This
// index page stays only so /research keeps resolving (P-02 route manifest) and
// any existing inbound links land somewhere useful.
export default function ResearchPage() {
  redirect('/news')
}
