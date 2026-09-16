import type { LocatedPlace, LocationRecord, RadiusMiles, SearchOrigin } from '../types/location'
import { milesBetween } from './distance'

export function withDistances(
  locations: LocationRecord[],
  origin: SearchOrigin | null,
): LocatedPlace[] {
  return locations.map((location) => ({
    ...location,
    distanceMiles: origin ? milesBetween(origin, location) : null,
  }))
}

export function filterPlaces(
  places: LocatedPlace[],
  options: {
    origin: SearchOrigin | null
    radius: RadiusMiles
    stateFilter: string | null
  },
): LocatedPlace[] {
  const { origin, radius, stateFilter } = options
  let next = places

  if (stateFilter) {
    next = next.filter((place) => place.state === stateFilter)
  } else if (origin && radius !== 'any') {
    next = next.filter(
      (place) => place.distanceMiles != null && place.distanceMiles <= radius,
    )
  }

  return [...next].sort((a, b) => {
    if (a.distanceMiles != null && b.distanceMiles != null) {
      return a.distanceMiles - b.distanceMiles
    }
    const state = a.state.localeCompare(b.state)
    if (state !== 0) return state
    return a.name.localeCompare(b.name)
  })
}

export function nearestPlaces(places: LocatedPlace[], count = 5): LocatedPlace[] {
  return [...places]
    .filter((place) => place.distanceMiles != null)
    .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0))
    .slice(0, count)
}
