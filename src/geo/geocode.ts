import type { GeocodeKind, GeocodeResult } from '../types'

const ZIP_RE = /^\d{5}(?:-\d{4})?$/

export async function geocodeQuery(input: string): Promise<GeocodeResult | null> {
  const q = input.trim()
  if (!q) return null

  if (ZIP_RE.test(q.split(/\s+/)[0] ?? '')) {
    const zip = (q.match(/^\d{5}/) ?? [q])[0]
    const fromZip = await geocodeZip(zip)
    if (fromZip) return fromZip
  }

  return (await geocodeNominatim(q)) ?? (await geocodePhoton(q))
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    url.searchParams.set('zoom', '10')
    url.searchParams.set('addressdetails', '1')
    const res = await fetch(url, { headers: nominatimHeaders() })
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
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`)
    if (res.ok) {
      const data = (await res.json()) as {
        'post code'?: string
        places?: Array<{
          'place name': string
          state: string
          latitude: string
          longitude: string
          'state abbreviation': string
        }>
      }
      const place = data.places?.[0]
      if (place) {
        return {
          lat: Number(place.latitude),
          lng: Number(place.longitude),
          label: `${place['place name']}, ${place['state abbreviation']} ${zip}`,
          kind: 'zip',
          state: place['state abbreviation'],
        }
      }
    }
  } catch {
    /* fall through */
  }
  return geocodeNominatim(zip)
}

async function geocodeNominatim(q: string): Promise<GeocodeResult | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('q', q)
    url.searchParams.set('countrycodes', 'us')
    url.searchParams.set('limit', '1')
    url.searchParams.set('addressdetails', '1')
    const res = await fetch(url, { headers: nominatimHeaders() })
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
    url.searchParams.set('limit', '1')
    url.searchParams.set('lang', 'en')
    const res = await fetch(url)
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
    const feature = data.features?.[0]
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
