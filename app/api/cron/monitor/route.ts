import { dispatchWorkflow } from '@/lib/githubDispatch'

export const dynamic = 'force-dynamic'

// Starts synthetic-monitor.yml — called every 15 min by the external timer (see lib/githubDispatch.ts).
export async function GET(req: Request) {
  return dispatchWorkflow(req, 'synthetic-monitor.yml', 'monitor')
}
