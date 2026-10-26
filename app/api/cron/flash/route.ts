import { dispatchWorkflow } from '@/lib/githubDispatch'

export const dynamic = 'force-dynamic'

// Starts flash-brief.yml — called every 15 min by the external timer (see lib/githubDispatch.ts).
export async function GET(req: Request) {
  return dispatchWorkflow(req, 'flash-brief.yml', 'flash')
}
