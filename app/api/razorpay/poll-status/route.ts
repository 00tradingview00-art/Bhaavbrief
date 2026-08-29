import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'
import { redisCommand } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: max 30 polls per minute per user (prevent runaway poll loops)
  const rlKey = `rl:poll:${userId}`
  const count = Number(await redisCommand('INCR', rlKey))
  if (count === 1) await redisCommand('EXPIRE', rlKey, '60')
  if (count > 30) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const pro = await isProUser(userId)
  const expiresAt = pro
    ? (await redisCommand('GET', `sub:${userId}:expires_at`)) as string | null
    : null

  return NextResponse.json({ isPro: pro, planExpires: expiresAt })
}
