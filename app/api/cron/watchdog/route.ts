import { dispatchWorkflow } from '@/lib/githubDispatch'

export const dynamic = 'force-dynamic'

// Starts watchdog.yml — called by the external timer (see lib/githubDispatch.ts)
// at its own cadence, 9:45 AM and 2:00 PM IST on weekdays.
export async function GET(req: Request) {
  return dispatchWorkflow(req, 'watchdog.yml', 'watchdog')
}
