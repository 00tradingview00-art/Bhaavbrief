import { NextResponse } from 'next/server'
import { loadEIA } from '@/lib/eia'
export type { EIAWeek, EIAData, EIAError, EIAResponse } from '@/lib/eia'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const data = await loadEIA()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
