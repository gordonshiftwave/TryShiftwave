import { findState, type UsState } from '../data/usStates'
import type { SearchOrigin } from '../types/location'

const ZIP_RE = /^\d{5}(?:-\d{4})?$/
const cache = new Map<string, GeocodeSuccess>()

export type GeocodeSuccess = SearchOrigin
export type GeocodeResult =
  | { ok: true; origin: GeocodeSuccess; state?: UsState }
  | { ok: false; message: string }

function cacheKey(query: string): string {
  return query.trim().toLowerCase()
}

async function fromZippopotam(zip: string): Promise<GeocodeSuccess | null> {
  const response = await fetch(`https://api.zippopotam.us/us/${zip}`)
  if (!response.ok) return null
  const data = (await response.json()) as {
    'post code'?: string
    places?: Array<{
      latitude: string
      longitude: string
      'place name': string
      'state abbreviation': string
    }>
  }
  const place = data.places?.[0]
  if (!place) return null
  return {
    lat: Number(place.latitude),
    lng: Number(place.longitude),
    label: `${place['place name']}, ${place['state abbreviation']} ${zip}`,
    kind: 'zip',
    stateCode: place['state abbreviation'],
  }
}

async function fromCensus(query: string): Promise<GeocodeSuccess | null> {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
  url.searchParams.set('address', query)
  url.searchParams.set('benchmark', '4')
  url.searchParams.set('format', 'json')
  const response = await fetch(url)
  if (!response.ok) return null
  const data = (await response.json()) as {
    result?: {
      addressMatches?: Array<{
        coordinates?: { x: number; y: number }
        matchedAddress?: string
      }>
    }
  }
  const match = data.result?.addressMatches?.[0]
  if (!match?.coordinates) return null
  return {
    lat: match.coordinates.y,
    lng: match.coordinates.x,
    label: match.matchedAddress || query,
    kind: ZIP_RE.test(query) ? 'zip' : 'place',
  }
}

async function fromNominatim(query: string): Promise<GeocodeSuccess | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'us')
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) return null
  const data = (await response.json()) as Array<{
    lat: string
    lon: string
    display_name: string
  }>
  const hit = data[0]
  if (!hit) return null
  const short = hit.display_name.split(',').slice(0, 3).join(',').trim()
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: short || query,
    kind: 'place',
  }
}

export async function geocodeQuery(rawQuery: string): Promise<GeocodeResult> {
  const query = rawQuery.trim()
  if (!query) {
    return { ok: false, message: 'Enter a ZIP, city, or address to search.' }
  }

  const key = cacheKey(query)
  const cached = cache.get(key)
  if (cached) return { ok: true, origin: cached }

  const state = findState(query)
  if (state) {
    const origin: GeocodeSuccess = {
      lat: state.center[1],
      lng: state.center[0],
      label: state.name,
      kind: 'state',
      stateCode: state.abbr,
    }
    cache.set(key, origin)
    return { ok: true, origin, state }
  }

  const zip = query.match(ZIP_RE)?.[0]?.slice(0, 5)
  try {
    if (zip) {
      const origin =
        (await fromZippopotam(zip)) ||
        (await fromCensus(zip)) ||
        (await fromNominatim(zip))
      if (origin) {
        cache.set(key, origin)
        return { ok: true, origin }
      }
      return {
        ok: false,
        message: `We couldn’t find ZIP ${zip}. Check the digits, or try a city name.`,
      }
    }

    const origin = (await fromNominatim(query)) || (await fromCensus(query))
    if (origin) {
      cache.set(key, origin)
      return { ok: true, origin }
    }
    return {
      ok: false,
      message: 'We couldn’t find that place. Try a 5-digit ZIP, city, or street address.',
    }
  } catch {
    return {
      ok: false,
      message: 'Search is having trouble right now. Try again in a moment.',
    }
  }
}

export function originFromGeolocation(
  coords: GeolocationCoordinates,
): SearchOrigin {
  return {
    lat: coords.latitude,
    lng: coords.longitude,
    label: 'Your location',
    kind: 'geolocation',
  }
}

export function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location is blocked in this browser. Try a ZIP instead.'
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Your device could not find a location. Try a ZIP instead.'
  }
  return 'Location timed out. Try a ZIP instead.'
}
