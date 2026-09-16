export type LocationRecord = {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  hours: string
  lat: number
  lng: number
  qualified: boolean
  category?: string
  notes?: string
}

export type LocatedPlace = LocationRecord & {
  distanceMiles: number | null
}

export type SearchOrigin = {
  lat: number
  lng: number
  label: string
  kind: 'zip' | 'place' | 'geolocation' | 'state'
  stateCode?: string
}

export type RadiusMiles = 25 | 50 | 100 | 250 | 'any'

export type CameraTarget =
  | { type: 'us' }
  | { type: 'point'; lng: number; lat: number; zoom: number }
  | {
      type: 'bounds'
      bounds: [[number, number], [number, number]]
      padding?: number
    }
