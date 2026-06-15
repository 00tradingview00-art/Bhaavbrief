import { NextRequest, NextResponse } from 'next/server'
import { getReferralStatus } from '@/lib/referral'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref') ?? ''
  const refCode = ref.slice(0, 32).replace(/[^a-f0-9]/g, '')
  if (!refCode) return NextResponse.json({ visits: 0, unlocked: false })

  const status = await getReferralStatus(refCode)
  return NextResponse.json(status)
}
