import { dispatchWorkflow } from '@/lib/githubDispatch'

export const dynamic = 'force-dynamic'

// Starts intelligence-engine.yml — called every 15 min by the external timer (see lib/githubDispatch.ts).
export async function GET(req: Request) {
  return dispatchWorkflow(req, 'intelligence-engine.yml', 'intelligence')
}
