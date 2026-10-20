export type LocationCategory = 'clinic' | 'gym' | 'wellness' | 'studio'

/** How a visitor should show up. `none` is never listed. */
export const VISIT_MODELS = ['walk_in', 'appointment', 'none'] as const
export type VisitModel = (typeof VISIT_MODELS)[number]

export type LocationRecord = {
  id: string
  name: string
  street: string
  city: string
  state: string
  zip: string
  /** Blank on the historical US list. A name or 2-letter code for other countries. */
  country: string
  lat: number
  lng: number
  phone: string
  email: string
  hours: string
  website: string
  /** Sheet category label (e.g. "Longevity / Wellness Center"). */
  category: string
  region: string
  qualified: boolean
  publicFacing: boolean
  demoConsent: boolean
  /** Compat: true when visitModel is walk_in. Appointment is listed, not hidden. */
  walkInOk: boolean
  visitModel: VisitModel
  notes: string
}

/** Public list copy. Walk-in stays quiet; appointment must not read as walk-in. */
export function visitModelLabel(model: VisitModel): string | null {
  if (model === 'appointment') return 'By appointment. Call to schedule.'
  return null
}

export type Coord = {
  lat: number
  lng: number
}

export type GeocodeKind = 'zip' | 'city' | 'address' | 'state' | 'country' | 'geolocation'

export type GeocodeResult = Coord & {
  label: string
  kind: GeocodeKind
  state?: string
  /** Country name when the geocoder returned one. */
  country?: string
  /** ISO 3166-1 alpha-2. Miles are used only when this is US. */
  countryCode?: string
}

export type RankedLocation = LocationRecord & {
  distanceMiles: number | null
}

/** Pin color bucket for a free-form sheet category. */
export function pinKind(category: string): LocationCategory {
  const s = category.trim().toLowerCase()
  if (/(studio|pilates)/.test(s)) return 'studio'
  if (/(gym|fitness|performance)/.test(s)) return 'gym'
  if (
    /(clinic|physical therapy|chiropract|primary care|psychiatr|medicine|ketamine|neurofeedback|brain health|orthodont|\bpt\b)/.test(
      s,
    )
  ) {
    return 'clinic'
  }
  return 'wellness'
}

export function categoryLabel(category: string): string {
  const label = category.trim()
  if (label) return label
  return 'Try-spot'
}

export const NEARBY_RADIUS_OPTIONS = [25, 50, 100] as const
export const DEFAULT_RADIUS_MILES = 50
/** Opening view: most inhabited land, not a US-only frame. */
export const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-140, -50],
  [160, 72],
]
