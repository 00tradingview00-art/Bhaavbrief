/**
 * scripts/ping-indexing-api.mjs
 * Notifies the Google Indexing API that a URL has been updated, so Google
 * crawls it within hours instead of waiting for its normal crawl schedule.
 *
 * Prerequisites:
 *   1. Create a GCP service account, enable the Indexing API, download the
 *      JSON key, and add the service account as a verified owner in GSC.
 *   2. Store the full JSON key contents as the GOOGLE_INDEXING_SA_KEY secret
 *      in GitHub repo settings.
 *
 * Usage: node scripts/ping-indexing-api.mjs <url>
 */

import crypto from 'node:crypto'
import https  from 'node:https'

const targetUrl = process.argv[2]
if (!targetUrl) {
  console.error('Usage: node scripts/ping-indexing-api.mjs <url>')
  process.exit(1)
}

const saKeyRaw = process.env.GOOGLE_INDEXING_SA_KEY
if (!saKeyRaw) {
  console.log('GOOGLE_INDEXING_SA_KEY not set — skipping indexing ping')
  process.exit(0)
}

let sa
try {
  sa = JSON.parse(saKeyRaw)
} catch {
  console.error('GOOGLE_INDEXING_SA_KEY is not valid JSON')
  process.exit(1)
}

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function post(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(body)
    const req = https.request(
      { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': data.length } },
      res => {
        let raw = ''
        res.on('data', c => raw += c)
        res.on('end', () => resolve({ status: res.statusCode, body: raw }))
      }
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// Build a signed JWT for the service account
const now = Math.floor(Date.now() / 1000)
const jwtHeader  = b64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
const jwtPayload = b64url(Buffer.from(JSON.stringify({
  iss:   sa.client_email,
  scope: 'https://www.googleapis.com/auth/indexing',
  aud:   'https://oauth2.googleapis.com/token',
  iat:   now,
  exp:   now + 3600,
})))
const signer = crypto.createSign('RSA-SHA256')
signer.update(`${jwtHeader}.${jwtPayload}`)
const jwt = `${jwtHeader}.${jwtPayload}.${b64url(signer.sign(sa.private_key))}`

// Exchange JWT for an access token
const tokenRes = await post(
  'oauth2.googleapis.com',
  '/token',
  `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  { 'Content-Type': 'application/x-www-form-urlencoded' }
)

if (tokenRes.status !== 200) {
  console.error(`Token exchange failed (${tokenRes.status}): ${tokenRes.body}`)
  process.exit(1)
}

const { access_token } = JSON.parse(tokenRes.body)

// Notify the Indexing API
const indexRes = await post(
  'indexing.googleapis.com',
  '/v3/urlNotifications:publish',
  JSON.stringify({ url: targetUrl, type: 'URL_UPDATED' }),
  { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }
)

if (indexRes.status === 200) {
  console.log(`Indexing ping OK — ${targetUrl}`)
} else {
  console.error(`Indexing ping failed (${indexRes.status}): ${indexRes.body}`)
  process.exit(1)
}
