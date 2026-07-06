import { NextResponse } from 'next/server'
import { KiteClient } from '@/lib/kite'

// Debug endpoint — shows what the fixed parser sees after quote/CRLF stripping
export async function GET() {
  if (!process.env.KITE_API_KEY || !process.env.KITE_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'No Kite credentials' }, { status: 503 })
  }

  try {
    const kc = new KiteClient(process.env.KITE_API_KEY, process.env.KITE_ACCESS_TOKEN)
    const all = await kc.getFullMCXInstruments()   // uses fixed parseInstrumentsCSV

    const options = all.filter(i => i.instrument_type === 'CE' || i.instrument_type === 'PE')
    const futures = all.filter(i => i.instrument_type === 'FUT')

    const uniqueOptionNames = [...new Set(options.map(i => i.name))].sort()
    const uniqueFutNames    = [...new Set(futures.map(i => i.name))].sort()

    // Test the exact filter used by the options API
    const goldOpts = options.filter(i => i.name.toUpperCase() === 'GOLD')
    const goldFuts = futures.filter(i => i.name.toUpperCase() === 'GOLD')

    return NextResponse.json({
      totalParsed:      all.length,
      totalOptions:     options.length,
      totalFutures:     futures.length,
      uniqueOptionNames,
      uniqueFutNames,
      goldOptionCount:  goldOpts.length,
      goldFutureCount:  goldFuts.length,
      goldOptionSample: goldOpts.slice(0, 5),
      goldFutureSample: goldFuts.slice(0, 3),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
