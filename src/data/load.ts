import type { LocationRecord } from '../types'
import { publicFile } from '../publicFile'
import { isPublicQualified, parseCsv, parseRow } from './parse'

const LOCAL_FEED = 'locations.json'

export type FeedStatus = 'ok' | 'empty' | 'invalid' | 'unavailable'
export type FeedSource = 'remote' | 'bundled'

export type FeedLoad = {
  places: LocationRecord[]
  status: FeedStatus
  dropped: number
  rawCount: number
  source: FeedSource
}

/**
 * A failed remote feed must not fall back to the bundled snapshot.
 * Restoring that snapshot would put withdrawn listings back on the map.
 * Always returns null.
 */
export function fallbackAfterFailure(primary: string, bundled: string): null {
  // Accept both URLs so the call site stays explicit. Never return either one.
  // A failed remote feed must not revive withdrawn listings from the snapshot.
  void primary
  void bundled
  return null
}

export function interpretFeedLoad(input: {
  source: FeedSource
  failed: boolean
  rawCount?: number
  places?: LocationRecord[]
  dropped?: number
}): FeedLoad {
  if (input.failed) {
    return {
      places: [],
      status: 'unavailable',
      dropped: 0,
      rawCount: 0,
      source: input.source,
    }
  }
  const places = input.places ?? []
  const rawCount = input.rawCount ?? 0
  const dropped = input.dropped ?? Math.max(0, rawCount - places.length)
  let status: FeedStatus = 'ok'
  if (rawCount === 0) status = 'empty'
  else if (places.length === 0) status = 'invalid'
  return { places, status, dropped, rawCount, source: input.source }
}

/**
 * Load public-qualified try-spots from one URL.
 *
 * Uses `VITE_LOCATIONS_URL` when set, otherwise the committed
 * `public/locations.json`. A failed or empty remote feed stays empty and
 * reports a status. It does not revive the bundled snapshot.
 */
export async function loadLocations(): Promise<FeedLoad> {
  const bundled = publicFile(LOCAL_FEED)
  return loadLocationsFrom(resolveLocationsUrl(), bundled)
}

export async function loadLocationsFrom(
  primary: string,
  bundled: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FeedLoad> {
  const source: FeedSource = primary === bundled ? 'bundled' : 'remote'
  try {
    const loaded = await loadFromUrl(primary, fetchImpl)
    const feed = interpretFeedLoad({ source, failed: false, ...loaded })
    logFeed(feed, primary)
    return feed
  } catch (err) {
    if (fallbackAfterFailure(primary, bundled) !== null) {
      throw new Error('Bundled snapshot fallback is disabled')
    }
    const feed = interpretFeedLoad({ source, failed: true })
    logFeed(feed, primary, err)
    return feed
  }
}

function logFeed(feed: FeedLoad, url: string, err?: unknown): void {
  const line = `[try-shiftwave] OPS: feed ${feed.status} source=${feed.source} rows=${feed.rawCount} shown=${feed.places.length} dropped=${feed.dropped} url=${url}`
  if (feed.status === 'ok' && feed.dropped === 0) return
  if (feed.status === 'unavailable') console.error(line, err)
  else console.warn(line)
}

async function loadFromUrl(
  url: string,
  fetchImpl: typeof fetch,
): Promise<{ places: LocationRecord[]; rawCount: number; dropped: number }> {
  const res = await fetchImpl(url, { cache: 'no-cache' })
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
  let dropped = 0
  rows.forEach((row, index) => {
    const parsed = parseRow(row, index)
    if (!parsed || !isPublicQualified(parsed)) {
      dropped += 1
      return
    }
    if (seen.has(parsed.id)) {
      dropped += 1
      return
    }
    seen.add(parsed.id)
    places.push(parsed)
  })
  return { places, rawCount: rows.length, dropped }
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
