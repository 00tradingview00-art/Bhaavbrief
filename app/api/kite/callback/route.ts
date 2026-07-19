import { NextRequest } from 'next/server'
import { KiteClient } from '@/lib/kite'

// Kite redirects here after login:
// https://bhaavbrief.in/api/kite/callback?request_token=xxx&status=success

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const requestToken = searchParams.get('request_token')
  const status       = searchParams.get('status')

  if (status !== 'success' || !requestToken) {
    return html('❌ Login Failed', 'Kite login was cancelled or failed. Close this window and try again.')
  }

  const apiKey    = process.env.KITE_API_KEY
  const apiSecret = process.env.KITE_API_SECRET

  if (!apiKey || !apiSecret) {
    return html('❌ Config Error', 'KITE_API_KEY or KITE_API_SECRET not set in Vercel environment.')
  }

  try {
    // Exchange request_token for access_token
    const session = await KiteClient.exchangeToken(apiKey, requestToken, apiSecret)
    const accessToken = session.access_token

    console.log(`✅ Kite session obtained for user ${session.user_id} at ${session.login_time}`)

    // Update GitHub Secrets (for intelligence engine GitHub Actions)
    const ghUpdated = await updateGitHubSecret(accessToken)

    // Update Vercel env (for website API routes)
    const vercelUpdated = await updateVercelEnv(accessToken)

    // Discover and cache MCX instrument tokens immediately
    let instrumentsMsg = ''
    try {
      const client = new KiteClient(apiKey, accessToken)
      await client.discoverAndCacheTokens()
      instrumentsMsg = `
        <div class="step">✅ Instrument tokens discovered and cached</div>
      `
    } catch (err) {
      instrumentsMsg = `<div class="warn">⚠️ Instrument discovery failed: ${err} — will retry on next request</div>`
    }

    return html('✅ Kite Auth Successful', `
      <p>BhaavBrief now has live MCX prices from Kite Connect.</p>
      <div class="step">✅ Access token obtained for ${session.user_id}</div>
      <div class="step">${ghUpdated ? '✅' : '⚠️'} GitHub Secret KITE_ACCESS_TOKEN ${ghUpdated ? 'updated automatically' : 'needs manual update'}</div>
      <div class="step">${vercelUpdated ? '✅' : '⚠️'} Vercel env KITE_ACCESS_TOKEN ${vercelUpdated ? 'updated — redeploy triggered' : 'needs manual update'}</div>
      ${instrumentsMsg}
      <p style="color:#666;font-size:13px;margin-top:24px">
        Token is valid until midnight tonight. Run this again tomorrow morning.<br>
        Shortcut: <strong>kite.trade/connect/login?api_key=${apiKey}&v=3</strong>
      </p>
    `)

  } catch (err) {
    console.error('Kite callback error:', err)
    return html('❌ Token Exchange Failed', `Error: ${String(err)}`)
  }
}

// ── Update GitHub Secret ──────────────────────────────────────────────────────
async function updateGitHubSecret(accessToken: string): Promise<boolean> {
  const ghPat  = process.env.GITHUB_PAT
  const ghRepo = process.env.GITHUB_REPO ?? '00tradingview00-art/Bhaavbrief'

  if (!ghPat) {
    console.warn('GITHUB_PAT not set — cannot update GitHub Secret automatically')
    return false
  }

  try {
    // Get repo public key
    const pkRes = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/secrets/public-key`,
      { headers: { Authorization: `Bearer ${ghPat}`, Accept: 'application/vnd.github+json' } }
    )
    const { key, key_id } = await pkRes.json()

    // Encrypt the secret using libsodium sealed-box, as GitHub's API requires
    const encrypted = await encryptSecret(key, accessToken)

    // Upsert the secret
    const putRes = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/secrets/KITE_ACCESS_TOKEN`,
      {
        method: 'PUT',
        headers: {
          Authorization:  `Bearer ${ghPat}`,
          Accept:         'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ encrypted_value: encrypted, key_id }),
      }
    )
    if (!putRes.ok && putRes.status !== 204) {
      console.error('GitHub Secret PUT failed:', putRes.status, await putRes.text())
      return false
    }
    return true
  } catch (err) {
    console.error('GitHub Secret update failed:', err)
    return false
  }
}

// ── Update Vercel Environment Variable ────────────────────────────────────────
interface VercelEnvVar {
  id:   string
  key:  string
  type: string
}

async function updateVercelEnv(accessToken: string): Promise<boolean> {
  const vercelToken    = process.env.VERCEL_TOKEN
  const vercelProjectId= process.env.VERCEL_PROJECT_ID

  if (!vercelToken || !vercelProjectId) {
    console.warn('VERCEL_TOKEN or VERCEL_PROJECT_ID not set — cannot update Vercel env automatically')
    return false
  }

  try {
    // Check if env var exists
    const listRes = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/env`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    )
    const { envs } = await listRes.json() as { envs?: VercelEnvVar[] }
    const existing = envs?.find(e => e.key === 'KITE_ACCESS_TOKEN')

    if (existing) {
      // Patch existing — preserve existing type (sensitive vars reject type changes)
      const patchRes = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/env/${existing.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: accessToken, type: existing.type }),
        }
      )
      if (!patchRes.ok) {
        console.error('Vercel env PATCH failed:', patchRes.status, await patchRes.text())
        return false
      }
    } else {
      // Create new
      const createRes = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/env`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key:    'KITE_ACCESS_TOKEN',
            value:  accessToken,
            type:   'encrypted',
            target: ['production', 'preview'],
          }),
        }
      )
      if (!createRes.ok) {
        console.error('Vercel env POST failed:', createRes.status, await createRes.text())
        return false
      }
    }

    // Trigger a Vercel redeploy so the new env var is picked up
    // (env changes require redeploy to take effect in serverless functions)
    const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK
    if (deployHookUrl) {
      const hookRes = await fetch(deployHookUrl, { method: 'POST' }).catch(err => {
        console.error('Vercel deploy hook request failed:', err)
        return null
      })
      if (hookRes && !hookRes.ok) {
        console.error('Vercel deploy hook responded', hookRes.status, await hookRes.text())
      }
    } else {
      console.warn('VERCEL_DEPLOY_HOOK not set — env change will not take effect until next natural deploy')
    }

    return true
  } catch (err) {
    console.error('Vercel env update failed:', err)
    return false
  }
}

// ── Encrypt for GitHub Secrets ─────────────────────────────────────────────────
// GitHub's Actions Secrets API requires libsodium sealed-box encryption
// (crypto_box_seal) — not a plain nacl.box with a random nonce, which produces
// a format GitHub's API rejects with "improperly encrypted secret".
async function encryptSecret(publicKey: string, secretValue: string): Promise<string> {
  const sodiumMod = await import('libsodium-wrappers')
  const sodium    = sodiumMod.default ?? sodiumMod
  await sodium.ready

  const keyBytes    = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL)
  const secretBytes = sodium.from_string(secretValue)
  const encrypted    = sodium.crypto_box_seal(secretBytes, keyBytes)

  return sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL)
}

// ── HTML response helper ──────────────────────────────────────────────────────
function html(title: string, body: string) {
  return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>${title} — BhaavBrief</title>
  <style>
    body { font-family: system-ui; max-width: 580px; margin: 60px auto; padding: 0 20px; line-height: 1.7; color: #1a1a1a }
    h2   { font-size: 24px; margin-bottom: 16px }
    .step{ background: #edfaf3; padding: 11px 15px; border-radius: 6px; margin: 8px 0; font-size: 14px }
    .warn{ background: #fff8ed; padding: 11px 15px; border-radius: 6px; margin: 8px 0; font-size: 14px; color: #92400e }
    p    { font-size: 14px; color: #444 }
  </style>
</head>
<body>
  <h2>${title}</h2>
  ${body}
</body>
</html>`, { headers: { 'Content-Type': 'text/html' } })
}
