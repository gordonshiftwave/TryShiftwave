import { formatAddress } from '../data/parse'
import type { GeocodeResult, LocationRecord, RankedLocation } from '../types'
import { sameCountry } from './country'
import { statesMatch } from './states'

export function matchesState(place: LocationRecord, state?: string): boolean {
  if (!state) return false
  if (statesMatch(place.state, state)) return true
  return formatAddress(place).toLowerCase().includes(state.trim().toLowerCase())
}

/**
 * A whole state or country stays listed even when those places sit outside
 * the 25/50/100 control. City, postal, and "my location" searches use the radius.
 */
export function selectPlaces(
  origin: GeocodeResult,
  ranked: RankedLocation[],
  radiusMiles: number,
): { places: RankedLocation[]; regionWide: boolean } {
  if (origin.kind === 'state' && origin.state) {
    const inState = ranked.filter((place) => matchesState(place, origin.state))
    if (inState.length) return { places: inState, regionWide: true }
  }
  if (origin.kind === 'country') {
    const inCountry = ranked.filter((place) =>
      sameCountry(place.country, origin.countryCode, origin.country),
    )
    if (inCountry.length) return { places: inCountry, regionWide: true }
  }
  return {
    places: ranked.filter(
      (place) => place.distanceMiles != null && place.distanceMiles <= radiusMiles,
    ),
    regionWide: false,
  }
}
