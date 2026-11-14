import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { loadStandardLotSizes } from './commodityConstants'

// Guards exactly the bug both third-party audits found independently:
// app/learn/mcx-margin-calculator's Copper row said 1,000 kg while
// data/commodity-constants.json (and /learn/mcx-lot-sizes) have always
// said 2,500 kg. loadStandardLotSizes() now reads the canonical file
// directly, so this test is really asserting "the canonical file didn't
// change out from under the reader" rather than re-deriving the
// comparison — but that's exactly the guardrail: it fails loudly if
// someone reintroduces a hand-copied literal in either consuming page.
describe('mcx-margin-calculator standard lot sizes', () => {
  it('match data/commodity-constants.json', () => {
    const canonical = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/commodity-constants.json'), 'utf8'),
    )
    const lotSizes = loadStandardLotSizes()
    expect(lotSizes.gold).toBe(canonical.gold.mcxContractSizeGrams / 10)
    expect(lotSizes.silver).toBe(canonical.silver.mcxLotSizeKg)
    expect(lotSizes.crude).toBe(canonical.crude.mcxLotSizeBarrels)
    expect(lotSizes.natgas).toBe(canonical.natgas.mcxLotSizeMMBtu)
    expect(lotSizes.copper).toBe(canonical.copper.mcxLotSizeKg)
  })

  it('copper is 2,500 kg, not the 1,000 kg both audits found contradicted on this page', () => {
    expect(loadStandardLotSizes().copper).toBe(2500)
  })
})
