import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from './components/EmptyState'
import { LocationCard } from './components/LocationCard'
import { MapCanvas, type MapFocus } from './components/MapCanvas'
import { WaveMark } from './components/WaveMark'
import { loadLocations } from './data/load'
import { formatAddress } from './data/parse'
import { milesBetween, prefersReducedMotion } from './geo/distance'
import { geocodeQuery, reverseGeocode } from './geo/geocode'
import {
  DEFAULT_RADIUS_MILES,
  NEARBY_RADIUS_OPTIONS,
  type GeocodeResult,
  type LocationRecord,
  type RankedLocation,
} from './types'

type Status = 'idle' | 'loading' | 'searching' | 'locating' | 'ready' | 'error'

export function App() {
  const [places, setPlaces] = useState<LocationRecord[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [origin, setOrigin] = useState<GeocodeResult | null>(null)
  const [radius, setRadius] = useState(DEFAULT_RADIUS_MILES)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focus, setFocus] = useState<MapFocus>({ type: 'us' })
  const [geoNote, setGeoNote] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadLocations()
      .then((rows) => {
        if (cancelled) return
        setPlaces(rows)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load locations')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const ranked: RankedLocation[] = useMemo(() => {
    if (!origin) {
      return places.map((place) => ({ ...place, distanceMiles: null }))
    }
    return places
      .map((place) => ({
        ...place,
        distanceMiles: milesBetween(origin, place),
      }))
      .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0))
  }, [places, origin])

  const nearby = useMemo(() => {
    if (!origin) return ranked
    if (origin.kind === 'state' && origin.state) {
      const inState = ranked.filter((place) => matchesState(place, origin.state))
      if (inState.length) return inState
    }
    return ranked.filter(
      (place) => place.distanceMiles != null && place.distanceMiles <= radius,
    )
  }, [origin, ranked, radius])

  const closestFallback = ranked.slice(0, 3)
  const list = origin ? nearby : groupStable(ranked)
  const emptyNearby = Boolean(origin) && nearby.length === 0

  useEffect(() => {
    if (!selectedId) return
    const node = document.getElementById(`place-${selectedId}`)
    node?.scrollIntoView({
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [selectedId])

  async function runSearch(text: string) {
    const q = text.trim()
    if (!q) return
    setStatus('searching')
    setError(null)
    setGeoNote(null)
    const result = await geocodeQuery(q)
    setStatus('ready')
    if (!result) {
      setError('We couldn’t find that place. Try a US ZIP, city, or street address.')
      return
    }
    applyOrigin(result)
  }

  function applyOrigin(result: GeocodeResult) {
    setOrigin(result)
    setQuery(result.label)
    const scored = places
      .map((place) => ({ place, distance: milesBetween(result, place) }))
      .sort((a, b) => a.distance - b.distance)
    const matches =
      result.kind === 'state' && result.state
        ? scored.filter((row) => matchesState(row.place, result.state))
        : scored.filter((row) => row.distance <= radius)
    const pool = matches.length ? matches : scored.slice(0, 3)
    setFocus({
      type: 'fit',
      coords: [result, ...pool.map((row) => row.place)],
    })
    setSelectedId(matches[0]?.place.id ?? null)
  }

  async function useMyLocation() {
    setGeoNote(null)
    setError(null)
    if (!('geolocation' in navigator)) {
      setGeoNote('This browser can’t share a location. Search a ZIP or city instead.')
      return
    }
    if (!window.isSecureContext) {
      setGeoNote('Location needs a secure (https) connection. Search a ZIP instead.')
      return
    }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const label = await reverseGeocode(lat, lng)
        setStatus('ready')
        applyOrigin({ lat, lng, label, kind: 'geolocation' })
      },
      (err) => {
        setStatus('ready')
        if (err.code === err.PERMISSION_DENIED) {
          setGeoNote('Location permission is off — search a ZIP or city instead.')
        } else if (err.code === err.TIMEOUT) {
          setGeoNote('Location timed out. Try again, or search a ZIP.')
        } else {
          setGeoNote('We couldn’t read your location. Try a city or ZIP.')
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
    )
  }

  function selectFromList(id: string) {
    const place = places.find((row) => row.id === id)
    if (!place) return
    setSelectedId(id)
    setFocus({ type: 'pin', coord: place })
  }

  function resetView() {
    setOrigin(null)
    setSelectedId(null)
    setError(null)
    setGeoNote(null)
    setQuery('')
    setFocus({ type: 'us' })
  }

  const resultLabel = origin
    ? emptyNearby
      ? `No try-spots within ${radius} miles of ${origin.label}`
      : `${nearby.length} try-spot${nearby.length === 1 ? '' : 's'} near ${origin.label}`
    : `${places.length} qualified public try-spots`

  return (
    <div className="min-h-screen">
      <a
        href="#results"
        className="focus-ring sr-only absolute left-4 top-4 z-50 rounded-full bg-cream px-3 py-2 text-sm text-ink focus:not-sr-only"
      >
        Skip to results
      </a>

      <div className="border-b border-line bg-sand/80">
        <p className="mx-auto flex max-w-[1180px] items-start gap-3 px-5 py-2.5 text-sm text-ink-soft md:px-8">
          <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-coral" />
          <span>
            <strong className="font-semibold text-ink">Demo data — not the live partner list.</strong>{' '}
            Example spots so the map can be tried. Qualified live locations will replace these from
            the partner sheet.
          </span>
        </p>
      </div>

      <header className="mx-auto max-w-[1180px] px-5 pb-4 pt-8 md:px-8 md:pt-12">
        <div className="flex items-center gap-3 text-rise-deep">
          <WaveMark className="h-6 w-14" title="Shiftwave line-wave mark" />
          <p className="kicker m-0">Qualified demo locations</p>
        </div>
        <h1 className="mt-4 max-w-3xl font-display text-[2.15rem] leading-[1.08] font-medium tracking-tight text-ink sm:text-5xl md:text-[3.35rem]">
          Where Can I <em className="font-medium italic">Try</em> Shiftwave?
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Full-body pulsed pressure and guided breathwork. Find a public, walk-in-appropriate
          try-spot near you — partners who have consented to demos.
        </p>

        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault()
            void runSearch(query)
          }}
        >
          <label htmlFor="place-search" className="kicker">
            ZIP, city, or address
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="place-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="94107, Boulder, or 12 Nassau St, Princeton"
              autoComplete="off"
              className="focus-ring min-h-12 flex-1 rounded-[18px] border border-line bg-cream px-4 text-base text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.7)] placeholder:text-ink-faint/80"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="focus-ring min-h-12 flex-1 rounded-[18px] bg-rise-deep px-5 text-base font-semibold text-cream sm:flex-none"
                disabled={status === 'loading' || status === 'searching'}
              >
                {status === 'searching' ? 'Searching…' : 'Search'}
              </button>
              <button
                type="button"
                className="focus-ring min-h-12 flex-1 rounded-[18px] border border-line bg-cream px-4 text-base font-semibold text-ink sm:flex-none"
                onClick={() => void useMyLocation()}
                disabled={status === 'locating'}
              >
                {status === 'locating' ? 'Locating…' : 'Use my location'}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="kicker mr-1">Within</span>
          {NEARBY_RADIUS_OPTIONS.map((miles) => (
            <button
              key={miles}
              type="button"
              className={`focus-ring rounded-full px-3 py-1 text-sm ${
                radius === miles
                  ? 'bg-rise-deep text-cream'
                  : 'border border-line bg-cream text-ink-soft'
              }`}
              onClick={() => setRadius(miles)}
              aria-pressed={radius === miles}
            >
              {miles} mi
            </button>
          ))}
          {origin && (
            <button
              type="button"
              className="focus-ring ml-auto rounded-full px-3 py-1 text-sm text-ink-soft underline decoration-line underline-offset-4"
              onClick={resetView}
            >
              Show all US
            </button>
          )}
        </div>

        {(error || geoNote) && (
          <p className="mt-3 text-sm text-fall-deep" role="status">
            {error || geoNote}
          </p>
        )}
      </header>

      <main className="mx-auto grid max-w-[1180px] gap-5 px-5 pb-16 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:items-start md:px-8 lg:gap-8">
        <section id="results" className="order-2 md:order-1">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-medium text-ink">
              {status === 'loading' ? 'Loading try-spots…' : resultLabel}
            </h2>
          </div>

          {status === 'error' && !places.length && (
            <EmptyState
              title="Locations didn’t load"
              body="Check that locations.json is present, or that VITE_LOCATIONS_URL points at the live sheet export."
            />
          )}

          {emptyNearby && (
            <div className="mb-5">
              <EmptyState
                title="Nothing public nearby — yet"
                body={`We don’t have a qualified walk-in try-spot within ${radius} miles of ${origin?.label}. These are the closest example locations on the current demo list.`}
              />
            </div>
          )}

          {status === 'ready' && places.length === 0 && (
            <EmptyState
              title="No qualified locations"
              body="Every public pin must be marked qualified, public-facing, demo-consenting, and walk-in appropriate."
            />
          )}

          {emptyNearby && (
            <p className="kicker mb-3">Closest example locations</p>
          )}

          <ul className="space-y-3">
            {(emptyNearby ? closestFallback : list).map((place) => (
              <li key={place.id}>
                <LocationCard
                  place={place}
                  active={place.id === selectedId}
                  onSelect={() => selectFromList(place.id)}
                  onHover={setHoveredId}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="order-1 h-[42vh] min-h-[280px] md:sticky md:top-5 md:order-2 md:aspect-[5/4] md:h-auto md:min-h-[480px] md:max-h-[calc(100vh-5.5rem)]">
          <MapCanvas
            locations={ranked}
            origin={origin}
            selectedId={selectedId}
            hoveredId={hoveredId}
            focus={focus}
            onSelect={setSelectedId}
            onHover={setHoveredId}
          />
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-8 text-sm text-ink-faint md:flex-row md:items-center md:justify-between md:px-8">
          <p>Pins are qualified public demo locations only — not every purchaser.</p>
          <p>
            Map {origin ? `centered on ${origin.label}` : 'of the United States'} ·{' '}
            {places.length} listed
          </p>
        </div>
      </footer>
    </div>
  )
}

function matchesState(place: LocationRecord, state?: string): boolean {
  if (!state) return false
  const needle = state.trim().toLowerCase()
  const abbr = place.state.toLowerCase()
  const name = STATE_NAMES[place.state.toUpperCase()]?.toLowerCase()
  return abbr === needle || name === needle || formatAddress(place).toLowerCase().includes(needle)
}

function groupStable(rows: RankedLocation[]): RankedLocation[] {
  return [...rows].sort((a, b) => {
    const region = a.region.localeCompare(b.region)
    if (region !== 0) return region
    return a.name.localeCompare(b.name)
  })
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
}
