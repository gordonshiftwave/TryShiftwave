export type LocationCategory = 'clinic' | 'gym' | 'wellness' | 'studio'

export type LocationRecord = {
  id: string
  name: string
  street: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
  phone: string
  email: string
  hours: string
  website: string
  category: LocationCategory
  region: string
  qualified: boolean
  publicFacing: boolean
  demoConsent: boolean
  walkInOk: boolean
  notes: string
}

export type Coord = {
  lat: number
  lng: number
}

export type GeocodeKind = 'zip' | 'city' | 'address' | 'state' | 'geolocation'

export type GeocodeResult = Coord & {
  label: string
  kind: GeocodeKind
  state?: string
}

export type RankedLocation = LocationRecord & {
  distanceMiles: number | null
}

export const CATEGORY_LABEL: Record<LocationCategory, string> = {
  clinic: 'Clinic',
  gym: 'Gym',
  wellness: 'Wellness',
  studio: 'Studio',
}

export const NEARBY_RADIUS_OPTIONS = [25, 50, 100] as const
export const DEFAULT_RADIUS_MILES = 50
export const US_CENTER: Coord = { lat: 39.8, lng: -98.5 }
export const US_ZOOM = 3.55
