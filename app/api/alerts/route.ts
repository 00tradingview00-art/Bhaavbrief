import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { loadEventMap } from '@/lib/eventMap'
import { watchEvent, unwatchEvent, getWatchedEventIds } from '@/lib/alertSubscriptions'
import { incrementWindow } from '@/lib/userRateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const watched = await getWatchedEventIds(userId)
  return NextResponse.json({ watched })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Generous — a one-time localStorage migration on first load can fire a
  // handful of these in quick succession; this only needs to stop abuse.
  const count = await incrementWindow(`rl:alerts:${userId}`, 3600)
  if (count > 100) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json().catch(() => null) as { eventId?: unknown; watch?: unknown } | null
  const eventId = typeof body?.eventId === 'string' ? body.eventId : null
  const watch = body?.watch !== false // default true
  if (!eventId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Validate against the real event calendar — never store an arbitrary
  // client-supplied ID the notify cron would later have nothing to look up.
  const known = loadEventMap().some(e => e.id === eventId)
  if (!known) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (watch) {
    const user = await currentUser()
    const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null
    if (!email) {
      return NextResponse.json({ error: 'No email on this account' }, { status: 400 })
    }
    await watchEvent(userId, email, eventId)
  } else {
    await unwatchEvent(userId, eventId)
  }

  return NextResponse.json({ ok: true })
}
