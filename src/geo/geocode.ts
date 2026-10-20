import type { GeocodeKind, GeocodeResult } from '../types'

const ZIP_RE = /^\d{5}(?:-\d{4})?$/

/**
 * Nominatim asks for at most one request per second and no autocomplete.
 * Search runs only when someone submits the field, and these calls wait
 * their turn. A bare US ZIP tries Zippopotam first and stays in the United
 * States. A 4-digit or other 5-digit code that matches more than one country
 * comes back as a choice list. Any other city, street, or postal code goes
 * to Nominatim, then Photon, with no country limit.
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

/** 4-digit and 5-digit codes are postcodes in many countries, not only US ZIPs. */
export function isBareNumericPostal(input: string): boolean {
  return /^\d{4,5}$/.test(input.trim())
}

export type GeocodeSearchResult =
  | { type: 'place'; place: GeocodeResult }
  | { type: 'choices'; query: string; choices: GeocodeResult[] }

/**
 * A confirmed US ZIP stays a US place. Any other bare numeric code that
 * matches more than one country asks the visitor to pick, instead of
 * silently using the first hit.
 */
export async function geocodeSearch(input: string): Promise<GeocodeSearchResult | null> {
  const q = input.trim()
  if (!q) return null

  if (isZipQuery(q)) {
    const fromZip = await geocodeZip(q.slice(0, 5))
    if (fromZip) return { type: 'place', place: fromZip }
  }

  if (isBareNumericPostal(q)) {
    const hits = await nominatimHits(q, 20)
    if (hits) {
      const choices = distinctPostcodePlaces(hits, q)
      if (choices.length > 1) return { type: 'choices', query: q, choices }
      if (choices.length === 1) return { type: 'place', place: choices[0] }
    }
    const photon = await geocodePhoton(q)
    return photon ? { type: 'place', place: photon } : null
  }

  const one = (await geocodeNominatim(q)) ?? (await geocodePhoton(q))
  return one ? { type: 'place', place: one } : null
}

export async function geocodeQuery(input: string): Promise<GeocodeResult | null> {
  const found = await geocodeSearch(input)
  if (!found || found.type === 'choices') return null
  return found.place
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ label: string; countryCode?: string }> {
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
    if (!res.ok) return { label: 'Your location' }
    const data = (await res.json()) as {
      address?: {
        city?: string
        town?: string
        village?: string
        state?: string
        country?: string
        country_code?: string
      }
      name?: string
    }
    const city =
      data.address?.city || data.address?.town || data.address?.village || data.name
    const state = data.address?.state
    const country = data.address?.country
    const countryCode = data.address?.country_code?.toUpperCase()
    const inUs = countryCode === 'US'
    let label = 'Your location'
    if (city && state && inUs) label = `${city}, ${state}`
    else if (city && country && !inUs) label = `${city}, ${country}`
    else if (city && state) label = `${city}, ${state}`
    else if (city) label = city
    else if (country) label = country
    return { label, countryCode }
  } catch {
    return { label: 'Your location' }
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
      country: 'United States',
      countryCode: 'US',
    }
  } catch {
    return null
  }
}

async function geocodeNominatim(q: string): Promise<GeocodeResult | null> {
  const rows = await nominatimHits(q, 1)
  const hit = rows?.[0]
  if (!hit) return null
  return fromNominatim(hit, q)
}

async function nominatimHits(q: string, limit: number): Promise<NominatimHit[] | null> {
  try {
    await pace(NOMINATIM_GAP_MS, nominatimPace)
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('q', q)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('addressdetails', '1')
    const res = await fetch(url, {
      headers: nominatimHeaders(),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const rows = (await res.json()) as NominatimHit[]
    return Array.isArray(rows) ? rows : null
  } catch {
    return null
  }
}

function postcodeMatches(hit: NominatimHit, query: string): boolean {
  const raw = hit.address?.postcode?.trim().toLowerCase() ?? ''
  if (!raw) return false
  const compact = (value: string) => value.replace(/[\s-]/g, '')
  return compact(raw) === compact(query.trim().toLowerCase())
}

function distinctPostcodePlaces(hits: NominatimHit[], query: string): GeocodeResult[] {
  const seen = new Set<string>()
  const places: GeocodeResult[] = []
  for (const hit of hits) {
    if (!postcodeMatches(hit, query)) continue
    const place = fromNominatim(hit, query)
    const key = (place.countryCode || place.country || '').trim().toUpperCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    places.push(place)
  }
  return places
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
          country?: string
          countrycode?: string
          osm_value?: string
          osm_key?: string
        }
      }>
    }
    const feature = data.features?.find((row) => {
      const coords = row.geometry?.coordinates
      return !!coords && coords.length >= 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1])
    })
    const coords = feature?.geometry?.coordinates
    const props = feature?.properties
    if (!coords || coords.length < 2 || !props) return null
    const countryCode = props.countrycode?.toUpperCase()
    const kind = photonKind(props.osm_key, props.osm_value)
    const labelParts = [props.name || props.city, props.state, props.postcode]
    if (countryCode && countryCode !== 'US' && props.country) labelParts.push(props.country)
    return {
      lat: coords[1],
      lng: coords[0],
      label: labelParts.filter(Boolean).join(', ') || q,
      kind,
      state: props.state,
      country: props.country,
      countryCode,
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
    country?: string
    country_code?: string
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
  const country = hit.address?.country
  const countryCode = hit.address?.country_code?.toUpperCase()
  const inUs = !countryCode || countryCode === 'US'
  let label = fallback
  if (kind === 'country' && country) label = country
  else if (kind === 'state' && state) label = inUs || !country ? state : `${state}, ${country}`
  else if (inUs && city && state) label = zip ? `${city}, ${state} ${zip}` : `${city}, ${state}`
  else if (!inUs) {
    const head = city || state
    const parts = [head, zip, country].filter(Boolean)
    label = parts.length ? parts.join(', ') : shortenDisplayName(hit.display_name) || fallback
  } else label = shortenDisplayName(hit.display_name) || fallback

  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label,
    kind,
    state,
    country,
    countryCode,
  }
}

function nominatimKind(hit: NominatimHit): GeocodeKind {
  const t = `${hit.addresstype ?? ''} ${hit.type ?? ''}`.toLowerCase()
  if (hit.addresstype === 'country' || hit.type === 'country') return 'country'
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
