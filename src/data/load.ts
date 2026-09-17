import type { LocationRecord } from '../types'
import { publicFile } from '../publicFile'
import { isPublicQualified, parseCsv, parseRow } from './parse'

const LOCAL_FEED = 'locations.json'

/**
 * Load public-qualified try-spots.
 *
 * Prefers `VITE_LOCATIONS_URL` (CORS-enabled JSON or CSV matching the schema
 * in INTEGRATION.md). If that fetch or parse fails, falls back to the
 * committed snapshot at `public/locations.json`. Only rows that pass the
 * qualification gate are returned.
 */
export async function loadLocations(): Promise<LocationRecord[]> {
  const primary = resolveLocationsUrl()
  const fallback = publicFile(LOCAL_FEED)
  const urls = primary === fallback ? [primary] : [primary, fallback]

  let lastError: unknown
  for (const url of urls) {
    try {
      return await loadFromUrl(url)
    } catch (err) {
      lastError = err
      if (url !== fallback) {
        console.warn(
          `[try-shiftwave] Locations feed failed (${url}); falling back to ${fallback}`,
          err,
        )
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Could not load locations')
}

async function loadFromUrl(url: string): Promise<LocationRecord[]> {
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) {
    throw new Error(`Could not load locations (${res.status})`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  const looksCsv =
    url.toLowerCase().includes('.csv') ||
    contentType.includes('text/csv') ||
    contentType.includes('spreadsheet')

  const rows = looksCsv ? parseCsv(await res.text()) : extractJsonRows(await res.json())

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

function resolveLocationsUrl(): string {
  const configured = import.meta.env.VITE_LOCATIONS_URL?.trim()
  if (!configured) return publicFile(LOCAL_FEED)
  if (/^[a-z][a-z0-9+.-]*:/i.test(configured)) return configured
  return publicFile(configured)
}
