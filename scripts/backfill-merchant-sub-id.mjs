/**
 * scripts/backfill-merchant-sub-id.mjs — one-time backfill of sub:{userId}:merchant_sub_id
 * for subscribers who activated before that field existed (shipped alongside the
 * self-serve cancel/change-plan flow). Without it, the Cashfree Manage Subscription API
 * (cancel/change-plan) has no merchant-supplied subscription_id to call, so those users
 * fall back to a "contact support" message instead of the self-serve buttons.
 *
 * Source of the missing value: app/api/cashfree/checkout/route.ts writes a temporary
 * `cfsub:{merchantSubId} -> userId` mapping at checkout time with a 14-day TTL. As long
 * as that mapping hasn't expired, this script can recover merchantSubId from it and
 * write it onto the user's still-active subscription record.
 *
 * Only reaches subscribers who checked out in roughly the last two weeks. New
 * activations already write merchant_sub_id directly, so this never needs to run again.
 *
 * Run once manually:
 *   node --env-file=.env.local scripts/backfill-merchant-sub-id.mjs --dry-run
 *   node --env-file=.env.local scripts/backfill-merchant-sub-id.mjs
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function redisCommand(cmd, ...args) {
  const res = await fetch(`${REDIS_URL}/${[cmd, ...args].map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Redis ${cmd} failed: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return json.result ?? null
}

async function scanAll(pattern) {
  const keys = []
  let cursor = '0'
  do {
    const result = await redisCommand('SCAN', cursor, 'MATCH', pattern, 'COUNT', '200')
    cursor = result[0]
    keys.push(...result[1])
  } while (cursor !== '0')
  return keys
}

async function main() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — run with `node --env-file=.env.local scripts/backfill-merchant-sub-id.mjs`')
    process.exitCode = 1
    return
  }

  const dryRun = process.argv.includes('--dry-run')
  console.log(dryRun ? 'DRY RUN — no writes will be made\n' : 'LIVE RUN — writing to production Redis\n')

  const cfsubKeys = await scanAll('cfsub:*')
  const mappingKeys = cfsubKeys.filter(k => !k.startsWith('cfsub:plan:'))
  console.log(`Found ${mappingKeys.length} checkout mapping key(s) to check.\n`)

  let backfilled = 0
  let skippedAlreadySet = 0
  let skippedNotActive = 0

  for (const key of mappingKeys) {
    const merchantSubId = key.slice('cfsub:'.length)
    const userId = await redisCommand('GET', key)
    if (!userId) continue

    const status = await redisCommand('GET', `sub:${userId}:status`)
    if (status !== 'active') {
      skippedNotActive++
      continue
    }

    const existing = await redisCommand('GET', `sub:${userId}:merchant_sub_id`)
    if (existing) {
      skippedAlreadySet++
      continue
    }

    console.log(`${dryRun ? '[dry-run] would set' : 'setting'} sub:${userId}:merchant_sub_id = ${merchantSubId}`)
    if (!dryRun) {
      await redisCommand('SET', `sub:${userId}:merchant_sub_id`, merchantSubId)
    }
    backfilled++
  }

  console.log(`\nDone. Backfilled: ${backfilled}, already set: ${skippedAlreadySet}, not active: ${skippedNotActive}.`)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
