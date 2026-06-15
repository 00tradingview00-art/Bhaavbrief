import { NextRequest, NextResponse } from 'next/server'
import { recordReferralVisit } from '@/lib/referral'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { ref, visitor_id } = await req.json()
    if (!ref || !visitor_id) return NextResponse.json({ error: 'missing params' }, { status: 400 })

    // Sanitise
    const refCode   = String(ref).slice(0, 32).replace(/[^a-f0-9]/g, '')
    const visitorId = String(visitor_id).slice(0, 64)
    if (!refCode) return NextResponse.json({ error: 'invalid ref' }, { status: 400 })

    const status = await recordReferralVisit(refCode, visitorId)
    return NextResponse.json(status)
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
