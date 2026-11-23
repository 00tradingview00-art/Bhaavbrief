import { dispatchWorkflow } from '@/lib/githubDispatch'

export const dynamic = 'force-dynamic'

// Starts refresh-event-impact.yml — called by the external timer (see
// lib/githubDispatch.ts) at its own weekly cadence, Monday 3:45 AM UTC.
export async function GET(req: Request) {
  return dispatchWorkflow(req, 'refresh-event-impact.yml', 'event-impact')
}
