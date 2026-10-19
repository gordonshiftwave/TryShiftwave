import type { GeocodeKind, GeocodeResult } from '../types'

const ZIP_RE = /^\d{5}(?:-\d{4})?$/

/**
 * Nominatim asks for at most one request per second and no autocomplete.
 * Search runs only when someone submits the field, and these calls wait
 * their turn. Zippopotam handles a bare ZIP so most searches never reach it.
 */
export const NOMINATIM_GAP_MS = 1100

type PaceState = { last: number }

const nominatimPace: PaceState = { last: 0 }

export async function pace(
  minGapMs: number,
  state: PaceState,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<void> {
  const wait = minGapMs - (now() - state.last)
  if (wait > 0) await sleep(wait)
  state.last = now()
}

export function isZipQuery(input: string): boolean {
  return ZIP_RE.test(input.trim())
}

export async function geocodeQuery(input: string): Promise<GeocodeResult | null> {
  const q = input.trim()
  if (!q) return null

  if (isZipQuery(q)) {
    const fromZip = await geocodeZip(q.slice(0, 5))
    if (fromZip) return fromZip
  }

  return (await geocodeNominatim(q)) ?? (await geocodePhoton(q))
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    await pace(NOMINATIM_GAP_MS, nominatimPace)
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    url.searchParams.set('zoom', '10')
    url.searchParams.set('addressdetails', '1')
    const res = await fetch(url, {
      headers: nominatimHeaders(),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return 'Your location'
    const data = (await res.json()) as {
      address?: { city?: string; town?: string; village?: string; state?: string }
      name?: string
    }
    const city =
      data.address?.city || data.address?.town || data.address?.village || data.name
    const state = data.address?.state
    if (city && state) return `${city}, ${state}`
    if (city) return city
    return 'Your location'
  } catch {
    return 'Your location'
  }
}

async function geocodeZip(zip: string): Promise<GeocodeResult | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      places?: Array<{
        'place name': string
        state: string
        latitude: string
        longitude: string
        'state abbreviation': string
      }>
    }
    const place = data.places?.[0]
    const lat = Number(place?.latitude)
    const lng = Number(place?.longitude)
    if (!place || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return {
      lat,
      lng,
      label: `${place['place name']}, ${place['state abbreviation']} ${zip}`,
      kind: 'zip',
      state: place['state abbreviation'],
    }
  } catch {
    return null
  }
}

async function geocodeNominatim(q: string): Promise<GeocodeResult | null> {
  try {
    await pace(NOMINATIM_GAP_MS, nominatimPace)
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('q', q)
    url.searchParams.set('countrycodes', 'us')
    url.searchParams.set('limit', '1')
    url.searchParams.set('addressdetails', '1')
    const res = await fetch(url, {
      headers: nominatimHeaders(),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const rows = (await res.json()) as NominatimHit[]
    const hit = rows[0]
    if (!hit) return null
    return fromNominatim(hit, q)
  } catch {
    return null
  }
}

async function geocodePhoton(q: string): Promise<GeocodeResult | null> {
  try {
    const url = new URL('https://photon.komoot.io/api/')
    url.searchParams.set('q', q)
    url.searchParams.set('limit', '5')
    url.searchParams.set('lang', 'en')
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: number[] }
        properties?: {
          name?: string
          city?: string
          state?: string
          postcode?: string
          countrycode?: string
          osm_value?: string
          osm_key?: string
        }
      }>
    }
    const feature = data.features?.find((row) => {
      const code = row.properties?.countrycode
      const coords = row.geometry?.coordinates
      const inUs = !code || code.toUpperCase() === 'US'
      return inUs && !!coords && coords.length >= 2
    })
    const coords = feature?.geometry?.coordinates
    const props = feature?.properties
    if (!coords || coords.length < 2 || !props) return null
    if (props.countrycode && props.countrycode.toUpperCase() !== 'US') return null
    const kind = photonKind(props.osm_key, props.osm_value)
    const labelParts = [props.name || props.city, props.state, props.postcode].filter(Boolean)
    return {
      lat: coords[1],
      lng: coords[0],
      label: labelParts.join(', ') || q,
      kind,
      state: props.state,
    }
  } catch {
    return null
  }
}

function nominatimHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
    'Accept-Language': 'en',
  }
}

type NominatimHit = {
  lat: string
  lon: string
  display_name: string
  addresstype?: string
  type?: string
  class?: string
  address?: {
    city?: string
    town?: string
    village?: string
    hamlet?: string
    state?: string
    postcode?: string
  }
}

function fromNominatim(hit: NominatimHit, fallback: string): GeocodeResult {
  const kind = nominatimKind(hit)
  const city =
    hit.address?.city ||
    hit.address?.town ||
    hit.address?.village ||
    hit.address?.hamlet
  const state = hit.address?.state
  const zip = hit.address?.postcode
  let label = fallback
  if (kind === 'state' && state) label = state
  else if (city && state) label = zip ? `${city}, ${state} ${zip}` : `${city}, ${state}`
  else label = shortenDisplayName(hit.display_name) || fallback

  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label,
    kind,
    state,
  }
}

function nominatimKind(hit: NominatimHit): GeocodeKind {
  const t = `${hit.addresstype ?? ''} ${hit.type ?? ''}`.toLowerCase()
  if (t.includes('postcode') || t.includes('postal')) return 'zip'
  if (t.includes('state') || hit.addresstype === 'state') return 'state'
  if (['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood'].some((k) => t.includes(k))) {
    return 'city'
  }
  return 'address'
}

function photonKind(key?: string, value?: string): GeocodeKind {
  const v = `${key ?? ''} ${value ?? ''}`.toLowerCase()
  if (v.includes('state') || v.includes('administrative')) {
    if (value === 'state') return 'state'
  }
  if (v.includes('postcode') || v.includes('postal')) return 'zip'
  if (['city', 'town', 'village'].some((k) => v.includes(k))) return 'city'
  return 'address'
}

function shortenDisplayName(name: string): string {
  const parts = name.split(',').map((p) => p.trim())
  return parts.slice(0, 3).join(', ')
}
