import { formatAddress } from '../data/parse'
import type { Coord } from '../types'

type DestinationPlace = {
  name: string
  street: string
  city: string
  state: string
  zip: string
  country?: string
  lat: number
  lng: number
}

type NavigatorLike = {
  userAgent?: string
  platform?: string
  maxTouchPoints?: number
}

/** iPhone and iPad open Apple Maps. Other phones and computers open Google Maps. */
export function prefersAppleMaps(nav?: NavigatorLike): boolean {
  const source = nav ?? (typeof navigator === 'undefined' ? undefined : navigator)
  const userAgent = source?.userAgent ?? ''
  const platform = source?.platform ?? ''
  const maxTouchPoints = source?.maxTouchPoints ?? 0
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true
  return platform === 'MacIntel' && maxTouchPoints > 1
}

export function destinationQuery(place: DestinationPlace): string {
  const address = formatAddress(place)
  const text = [place.name, address].filter(Boolean).join(', ')
  return text || `${place.lat},${place.lng}`
}

export function directionsHref(
  place: DestinationPlace,
  options?: { origin?: Coord | null; apple?: boolean },
): string {
  const destination = destinationQuery(place)
  const origin = options?.origin
  const apple = options?.apple ?? prefersAppleMaps()
  if (apple) {
    const params = new URLSearchParams()
    params.set('daddr', destination)
    params.set('dirflg', 'd')
    if (origin) params.set('saddr', `${origin.lat},${origin.lng}`)
    return `https://maps.apple.com/?${params.toString()}`
  }
  const params = new URLSearchParams()
  params.set('api', '1')
  params.set('destination', destination)
  params.set('travelmode', 'driving')
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
