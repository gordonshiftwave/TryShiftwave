import type { LocationRecord } from '../types'
import { isPublicQualified, parseCsv, parseRow } from './parse'

const DEFAULT_URL = '/locations.json'

/**
 * Load public-qualified demo locations.
 *
 * Swap the live Google Sheet in by setting VITE_LOCATIONS_URL:
 *   - a .json file (array, or { locations: [...] })
 *   - a published CSV (Google Sheet → File → Download → CSV, or export URL)
 *
 * Only rows that pass the qualification gate are returned.
 */
export async function loadLocations(): Promise<LocationRecord[]> {
  const url = import.meta.env.VITE_LOCATIONS_URL?.trim() || DEFAULT_URL
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) {
    throw new Error(`Could not load locations (${res.status})`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  const looksCsv =
    url.toLowerCase().includes('.csv') ||
    contentType.includes('text/csv') ||
    contentType.includes('spreadsheet')

  const rows = looksCsv
    ? parseCsv(await res.text())
    : extractJsonRows(await res.json())

  const seen = new Set<string>()
  const places: LocationRecord[] = []
  rows.forEach((row, index) => {
    const parsed = parseRow(row, index)
    if (!parsed || !isPublicQualified(parsed)) return
    if (seen.has(parsed.id)) return
    seen.add(parsed.id)
    places.push(parsed)
  })
  return places
}

function extractJsonRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if (Array.isArray(record.locations)) {
      return record.locations as Record<string, unknown>[]
    }
    if (Array.isArray(record.rows)) {
      return record.rows as Record<string, unknown>[]
    }
  }
  throw new Error('Locations JSON must be an array or { locations: [...] }')
}
