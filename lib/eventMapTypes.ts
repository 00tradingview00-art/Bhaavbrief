/**
 * lib/eventMapTypes.ts — pure types/constants for event-map data, safe to
 * import from client components (no fs/path — that's lib/eventMap.ts, which
 * is server-only and re-exports these).
 */

export type ImpactTier = 'high' | 'medium' | 'low' | 'context' | 'structural'
export type CadenceType = 'rule_based' | 'manual' | 'mcx_expiry'

export interface EventPriorField {
  value:        number | null
  unit:         string | null
  as_of_period: string | null
  source:       string
  as_of:        string
}

export interface EventMapEntry {
  id:                     string
  name:                   string
  source_url:             string
  frequency:              string
  cadence_type:           CadenceType
  next_release_utc:       string
  affected_contracts:     string[]
  impact_tier:            ImpactTier
  consensus_field:        null
  prior_field:            EventPriorField
  description_educational: string
}

// Maps event-map.json's affected_contracts keys to the URL slugs used by
// app/commodities/[commodity]/page.tsx's SLUG_MAP (e.g. 'crude' -> 'crude-oil').
export const COMMODITY_URL_SLUGS: Record<string, string> = {
  gold: 'gold',
  silver: 'silver',
  crude: 'crude-oil',
  copper: 'copper',
  natgas: 'natural-gas',
  zinc: 'zinc',
  aluminium: 'aluminium',
  lead: 'lead',
  nickel: 'nickel',
}

export const COMMODITY_LABELS: Record<string, string> = {
  gold: 'Gold',
  silver: 'Silver',
  crude: 'Crude Oil',
  copper: 'Copper',
  natgas: 'Natural Gas',
  zinc: 'Zinc',
  aluminium: 'Aluminium',
  lead: 'Lead',
  nickel: 'Nickel',
}
