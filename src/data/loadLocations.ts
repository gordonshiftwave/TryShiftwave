import type { LocationRecord } from '../types/location'
import { cell, headerIndex, parseCsv } from '../lib/csv'
import { isQualifiedFlag, slugId } from '../lib/qualify'

type LocationsFile = {
  locations?: unknown
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function str(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

export function normalizeLocation(raw: unknown, fallbackIndex = 0): LocationRecord | null {
  const row = asRecord(raw)
  if (!row) return null
  const lat = num(row.lat)
  const lng = num(row.lng)
  if (lat == null || lng == null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  const name = str(row.name)
  if (!name) return null

  const zip = str(row.zip)
  const qualifiedRaw = row.qualified
  const qualified =
    qualifiedRaw === undefined || qualifiedRaw === null || qualifiedRaw === ''
      ? true
      : isQualifiedFlag(qualifiedRaw as string | boolean)

  return {
    id: str(row.id) || `${slugId(name, zip) || 'location'}-${fallbackIndex}`,
    name,
    address: str(row.address),
    city: str(row.city),
    state: str(row.state).toUpperCase(),
    zip,
    phone: str(row.phone),
    email: str(row.email),
    hours: str(row.hours),
    lat,
    lng,
    qualified,
    category: str(row.category) || undefined,
    notes: str(row.notes) || undefined,
  }
}

export function parseLocationCsv(text: string): LocationRecord[] {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const [headerRow, ...data] = rows
  const index = headerIndex(headerRow)
  if (index.name == null || index.lat == null || index.lng == null) {
    throw new Error(
      'Locations CSV needs at least name, lat, and lng columns (see README for aliases).',
    )
  }

  const hasQualifiedColumn = index.qualified != null
  const locations: LocationRecord[] = []

  data.forEach((row, i) => {
    const raw = {
      id: cell(row, index, 'id'),
      name: cell(row, index, 'name'),
      address: cell(row, index, 'address'),
      city: cell(row, index, 'city'),
      state: cell(row, index, 'state'),
      zip: cell(row, index, 'zip'),
      phone: cell(row, index, 'phone'),
      email: cell(row, index, 'email'),
      hours: cell(row, index, 'hours'),
      lat: cell(row, index, 'lat'),
      lng: cell(row, index, 'lng'),
      qualified: hasQualifiedColumn ? cell(row, index, 'qualified') : true,
      category: cell(row, index, 'category'),
      notes: cell(row, index, 'notes'),
    }
    const loc = normalizeLocation(raw, i)
    if (loc) locations.push(loc)
  })

  return locations
}

export function parseLocationsJson(data: unknown): LocationRecord[] {
  const file = asRecord(data) as LocationsFile | null
  const list = Array.isArray(data)
    ? data
    : Array.isArray(file?.locations)
      ? file.locations
      : []
  return list
    .map((row, i) => normalizeLocation(row, i))
    .filter((row): row is LocationRecord => row != null)
}

export function publicLocations(all: LocationRecord[]): LocationRecord[] {
  return all.filter((location) => location.qualified)
}

export async function loadLocations(): Promise<{
  locations: LocationRecord[]
  source: 'sheet' | 'demo'
}> {
  const sheetUrl = import.meta.env.VITE_LOCATIONS_CSV_URL as string | undefined
  if (sheetUrl) {
    try {
      const response = await fetch(sheetUrl)
      if (!response.ok) throw new Error(`Sheet HTTP ${response.status}`)
      const csv = await response.text()
      const parsed = publicLocations(parseLocationCsv(csv))
      if (parsed.length === 0) throw new Error('Sheet parsed to zero public locations')
      return { locations: parsed, source: 'sheet' }
    } catch (error) {
      console.warn('Live sheet failed; falling back to local demo data.', error)
    }
  }

  const response = await fetch(`${import.meta.env.BASE_URL}locations.json`)
  if (!response.ok) throw new Error('Could not load locations.json')
  const json: unknown = await response.json()
  return { locations: publicLocations(parseLocationsJson(json)), source: 'demo' }
}
