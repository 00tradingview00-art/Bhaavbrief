// Server-side storage for /alerts "watch this event" subscriptions.
//
// Redis key schema (Upstash, via redisCommand):
//   alerts:{userId}            → SET of event IDs this user is watching
//   alerts-watchers:{eventId}  → SET of userIds watching this event (reverse
//                                 index — lets the notify cron find watchers
//                                 for an event without scanning every user)
//   alerts-email:{userId}      → the email to notify, cached at save-time
//                                 (avoids a Clerk API round-trip per
//                                 notification during the cron)
//   alerts-sent:{eventId}      → SET of userIds already notified for this
//                                 event (dedup — the cron is idempotent)
//
// Reverse-index and sent-dedup keys get a TTL so they don't accumulate
// forever for events that have long since passed.
import { redisCommand } from './redis'

const INDEX_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days — well past any alert's relevance

export async function watchEvent(userId: string, email: string, eventId: string): Promise<void> {
  await Promise.all([
    redisCommand('SADD', `alerts:${userId}`, eventId),
    redisCommand('SADD', `alerts-watchers:${eventId}`, userId),
    redisCommand('SET', `alerts-email:${userId}`, email),
  ])
  await redisCommand('EXPIRE', `alerts-watchers:${eventId}`, String(INDEX_TTL_SECONDS))
}

export async function unwatchEvent(userId: string, eventId: string): Promise<void> {
  await Promise.all([
    redisCommand('SREM', `alerts:${userId}`, eventId),
    redisCommand('SREM', `alerts-watchers:${eventId}`, userId),
  ])
}

export async function getWatchedEventIds(userId: string): Promise<string[]> {
  const ids = await redisCommand('SMEMBERS', `alerts:${userId}`) as string[] | null
  return ids ?? []
}

export async function getWatchers(eventId: string): Promise<string[]> {
  const ids = await redisCommand('SMEMBERS', `alerts-watchers:${eventId}`) as string[] | null
  return ids ?? []
}

export async function getNotifyEmail(userId: string): Promise<string | null> {
  return (await redisCommand('GET', `alerts-email:${userId}`)) as string | null
}

export async function wasNotified(eventId: string, userId: string): Promise<boolean> {
  const result = await redisCommand('SISMEMBER', `alerts-sent:${eventId}`, userId)
  return result === 1
}

export async function markNotified(eventId: string, userId: string): Promise<void> {
  await redisCommand('SADD', `alerts-sent:${eventId}`, userId)
  await redisCommand('EXPIRE', `alerts-sent:${eventId}`, String(INDEX_TTL_SECONDS))
}
