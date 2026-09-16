import type { LocationRecord } from '../types'
import { normalizeState, stateName } from '../geo/states'

/**
 * Canonical field names for a location row.
 *
 * These match the Google Sheet header row 1:1 (snake_case).
 * Extra alias headers are accepted in parseRow() so an existing
 * Dani spreadsheet can drop in with light cleanup.
 */
export const LOCATION_FIELDS = [
  'id',
  'name',
  'street',
  'address',
  'city',
  'state',
  'zip',
  'lat',
  'lng',
  'phone',
  'email',
  'hours',
  'website',
  'category',
  'region',
  'qualified',
  'public_facing',
  'demo_consent',
  'walk_in_ok',
  'notes',
] as const

export type LocationField = (typeof LOCATION_FIELDS)[number]

const KEY_ALIASES: Record<string, LocationField> = {
  id: 'id',
  location_id: 'id',
  name: 'name',
  business: 'name',
  business_name: 'name',
  location_name: 'name',
  street: 'street',
  address: 'address',
  address1: 'street',
  street_address: 'street',
  city: 'city',
  state: 'state',
  state_code: 'state',
  zip: 'zip',
  zip_code: 'zip',
  postal: 'zip',
  postal_code: 'zip',
  lat: 'lat',
  latitude: 'lat',
  lng: 'lng',
  lon: 'lng',
  long: 'lng',
  longitude: 'lng',
  phone: 'phone',
  tel: 'phone',
  telephone: 'phone',
  email: 'email',
  e_mail: 'email',
  hours: 'hours',
  opening_hours: 'hours',
  hours_of_operation: 'hours',
  website: 'website',
  url: 'website',
  category: 'category',
  type: 'category',
  location_type: 'category',
  region: 'region',
  metro: 'region',
  qualified: 'qualified',
  public_facing: 'public_facing',
  publicly_facing: 'public_facing',
  public: 'public_facing',
  demo_consent: 'demo_consent',
  consent: 'demo_consent',
  demo_ok: 'demo_consent',
  walk_in_ok: 'walk_in_ok',
  walk_in: 'walk_in_ok',
  walkin: 'walk_in_ok',
  walk_in_appropriate: 'walk_in_ok',
  notes: 'notes',
  note: 'notes',
  address_note: 'notes',
}

export function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s/|.-]+/g, '_')
}

export function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const s = String(value ?? '')
    .trim()
    .toLowerCase()
  return ['true', 'yes', 'y', '1', 'x', 'checked'].includes(s)
}

function str(value: unknown): string {
  return String(value ?? '').trim()
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number(String(value ?? '').trim())
  return Number.isFinite(n) ? n : null
}

function categoryOf(value: unknown): string {
  return str(value)
}

export function isPublicQualified(row: LocationRecord): boolean {
  return row.qualified && row.publicFacing && row.demoConsent && row.walkInOk
}

export function parseRow(
  raw: Record<string, unknown>,
  index: number,
): LocationRecord | null {
  const src: Partial<Record<LocationField, unknown>> = {}
  for (const [key, value] of Object.entries(raw)) {
    const aliased = KEY_ALIASES[normalizeKey(key)]
    if (aliased) src[aliased] = value
  }

  const lat = num(src.lat)
  const lng = num(src.lng)
  const name = str(src.name)
  if (lat == null || lng == null || !name) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  const id = str(src.id) || slug(`${name}-${index}`)
  const city = str(src.city)
  const state = normalizeState(str(src.state))
  const zip = str(src.zip)
  const street = streetLine(str(src.street), str(src.address), city, state, zip)

  return {
    id,
    name,
    street,
    city,
    state,
    zip,
    lat,
    lng,
    phone: str(src.phone),
    email: str(src.email),
    hours: str(src.hours),
    website: str(src.website),
    category: categoryOf(src.category),
    region: str(src.region),
    qualified: src.qualified == null || src.qualified === '' ? true : parseBool(src.qualified),
    publicFacing:
      src.public_facing == null || src.public_facing === ''
        ? true
        : parseBool(src.public_facing),
    demoConsent:
      src.demo_consent == null || src.demo_consent === ''
        ? true
        : parseBool(src.demo_consent),
    walkInOk:
      src.walk_in_ok == null || src.walk_in_ok === ''
        ? true
        : parseBool(src.walk_in_ok),
    notes: str(src.notes),
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** RFC-style CSV (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => h.trim())
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      const obj: Record<string, string> = {}
      headers.forEach((header, i) => {
        obj[header] = row[i] ?? ''
      })
      return obj
    })
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(cur)
      cur = ''
    } else if (c === '\n') {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else if (c !== '\r') {
      cur += c
    }
  }

  if (cur.length > 0 || row.length > 0) {
    row.push(cur)
    rows.push(row)
  }
  return rows
}

function streetLine(
  street: string,
  address: string,
  city: string,
  state: string,
  zip: string,
): string {
  if (street && !isCityLevelAddress(street, city, state, zip)) return street
  if (address && !isCityLevelAddress(address, city, state, zip)) return address
  return ''
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** True when the line is only city / state / ZIP — not a street address. */
function isCityLevelAddress(line: string, city: string, state: string, zip: string): boolean {
  const a = compact(line)
  if (!a) return true
  const abbr = normalizeState(state)
  const full = stateName(state)
  const variants = [
    [city, state, zip],
    [city, abbr, zip],
    [city, full, zip],
    [city, state],
    [city, abbr],
    [city, full],
    [full, zip],
    [abbr, zip],
    [full],
    [abbr],
  ]
  return variants.some((parts) => compact(parts.filter(Boolean).join(' ')) === a)
}

export function formatAddress(place: LocationRecord): string {
  const stateLabel = place.city ? place.state : stateName(place.state)
  const cityState = [place.city, stateLabel].filter(Boolean).join(', ')
  const locality = place.zip ? (cityState ? `${cityState} ${place.zip}` : place.zip) : cityState
  return [place.street, locality].filter(Boolean).join(', ')
}

export function mapsUrl(place: LocationRecord): string {
  const addr = formatAddress(place)
  const q = [place.name, addr].filter(Boolean).join(', ') || `${place.lat},${place.lng}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}
