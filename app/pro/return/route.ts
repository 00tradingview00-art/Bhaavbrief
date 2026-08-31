import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bhaavbrief.in'

/** Cashfree POSTs auth result here — redirect to /pro to poll webhook activation. */
export async function POST(): Promise<NextResponse> {
  return NextResponse.redirect(`${SITE}/pro?paid=1`, 303)
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.redirect(`${SITE}/pro?paid=1`, 303)
}
