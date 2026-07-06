import { NextResponse } from 'next/server'

// Temporary debug endpoint — see what MCX CE/PE names Kite actually returns
export async function GET() {
  if (!process.env.KITE_API_KEY || !process.env.KITE_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'No Kite credentials' }, { status: 503 })
  }

  const res = await fetch('https://api.kite.trade/instruments/MCX', {
    headers: {
      'X-Kite-Version': '3',
      Authorization: `token ${process.env.KITE_API_KEY}:${process.env.KITE_ACCESS_TOKEN}`,
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) return NextResponse.json({ error: `Kite ${res.status}` }, { status: res.status })

  const csv = await res.text()
  const lines = csv.split('\n').filter(Boolean)
  const header = lines[0].split(',')
  const idx = (col: string) => header.indexOf(col)

  const rows = lines.slice(1).map(line => {
    const cols = line.split(',')
    return {
      instrument_token: cols[idx('instrument_token')],
      tradingsymbol:    cols[idx('tradingsymbol')]?.trim(),
      name:             cols[idx('name')]?.trim(),
      instrument_type:  cols[idx('instrument_type')]?.trim(),
      expiry:           cols[idx('expiry')]?.trim(),
      strike:           cols[idx('strike')]?.trim(),
    }
  })

  const options = rows.filter(r => r.instrument_type === 'CE' || r.instrument_type === 'PE')
  const uniqueNames = [...new Set(options.map(r => r.name))].sort()

  return NextResponse.json({
    totalRows: rows.length,
    totalOptions: options.length,
    uniqueOptionNames: uniqueNames,
    sampleOptions: options.slice(0, 30),
    headerColumns: header,
  })
}
