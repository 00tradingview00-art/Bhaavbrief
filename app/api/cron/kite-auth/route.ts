import { dispatchWorkflow } from '@/lib/githubDispatch'

export const dynamic = 'force-dynamic'

// Starts kite-morning-auth.yml — called by the external timer (see
// lib/githubDispatch.ts) at its own daily cadence, 8:45 AM IST on weekdays.
export async function GET(req: Request) {
  return dispatchWorkflow(req, 'kite-morning-auth.yml', 'kite-auth')
}
