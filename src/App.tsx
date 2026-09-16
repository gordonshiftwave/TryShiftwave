import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from './components/EmptyState'
import { LocationCard } from './components/LocationCard'
import { MapCanvas, type MapFocus } from './components/MapCanvas'
import { SearchBar } from './components/SearchBar'
import { WaveMark } from './components/WaveMark'
import { loadLocations } from './data/load'
import { formatAddress } from './data/parse'
import { milesBetween, prefersReducedMotion } from './geo/distance'
import { geocodeQuery, reverseGeocode } from './geo/geocode'
import { statesMatch } from './geo/states'
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
  const [placesReady, setPlacesReady] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
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
        setPlacesReady(true)
        setStatus((current) => (current === 'searching' || current === 'locating' ? current : 'ready'))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadFailed(true)
        setPlacesReady(true)
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
    if (!origin) return []
    if (origin.kind === 'state' && origin.state) {
      const inState = ranked.filter((place) => matchesState(place, origin.state))
      if (inState.length) return inState
    }
    return ranked.filter(
      (place) => place.distanceMiles != null && place.distanceMiles <= radius,
    )
  }, [origin, ranked, radius])

  const closestFallback = ranked.slice(0, 3)
  const emptyNearby = Boolean(origin) && nearby.length === 0 && placesReady && places.length > 0
  const list = emptyNearby ? closestFallback : nearby
  const showingResults = origin !== null

  useEffect(() => {
    if (!origin) {
      setFocus({ type: 'us' })
      setSelectedId(null)
      return
    }
    const scored = places
      .map((place) => ({ place, distance: milesBetween(origin, place) }))
      .sort((a, b) => a.distance - b.distance)
    const matches =
      origin.kind === 'state' && origin.state
        ? scored.filter((row) => matchesState(row.place, origin.state))
        : scored.filter((row) => row.distance <= radius)
    const pool = matches.length ? matches : scored.slice(0, 3)
    setFocus({
      type: 'fit',
      coords: [origin, ...pool.map((row) => row.place)],
    })
    setSelectedId((current) => {
      if (current && pool.some((row) => row.place.id === current)) return current
      return matches[0]?.place.id ?? pool[0]?.place.id ?? null
    })
  }, [origin, places, radius])

  useEffect(() => {
    if (!selectedId) return
    const node = document.getElementById(`place-${selectedId}`)
    node?.scrollIntoView({
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [selectedId])

  useEffect(() => {
    if (!origin) return
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [origin])

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
    : ''

  return (
    <div className="min-h-screen">
      {showingResults && (
        <a
          href="#results"
          className="focus-ring sr-only absolute left-4 top-4 z-50 rounded-full bg-cream px-3 py-2 text-sm text-ink focus:not-sr-only"
        >
          Skip to results
        </a>
      )}

      <LiveListBanner />

      {showingResults ? (
        <ResultsView
          query={query}
          onQueryChange={setQuery}
          onSearch={(text) => void runSearch(text)}
          onUseLocation={() => void useMyLocation()}
          onReset={resetView}
          searching={status === 'searching'}
          locating={status === 'locating'}
          error={error}
          geoNote={geoNote}
          resultLabel={!placesReady ? 'Loading try-spots…' : resultLabel}
          radius={radius}
          onRadius={setRadius}
          loadFailed={loadFailed}
          noQualified={placesReady && !loadFailed && places.length === 0}
          emptyNearby={emptyNearby}
          originLabel={origin?.label}
          list={list}
          ranked={ranked}
          origin={origin}
          selectedId={selectedId}
          hoveredId={hoveredId}
          focus={focus}
          onSelect={selectFromList}
          onHover={setHoveredId}
          onSelectPin={setSelectedId}
        />
      ) : (
        <LandingView
          query={query}
          onQueryChange={setQuery}
          onSearch={(text) => void runSearch(text)}
          onUseLocation={() => void useMyLocation()}
          searching={status === 'searching'}
          locating={status === 'locating'}
          error={error}
          geoNote={geoNote}
          loadFailed={loadFailed}
        />
      )}
    </div>
  )
}

function LiveListBanner() {
  return (
    <div className="live-banner">
      <p className="mx-auto flex max-w-[1100px] items-start gap-2.5 px-5 py-2 text-[0.8rem] leading-snug text-ink-soft sm:gap-3 sm:py-2.5 sm:text-sm md:px-8">
        <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-energy" />
        <span>
          <strong className="font-semibold text-ink">Live partner list.</strong> Qualified public
          try-spots from the partner sheet. Hours may require a call. Some pins are city-level until
          a street address is added.
        </span>
      </p>
    </div>
  )
}

type LandingViewProps = {
  query: string
  onQueryChange: (value: string) => void
  onSearch: (query: string) => void
  onUseLocation: () => void
  searching: boolean
  locating: boolean
  error: string | null
  geoNote: string | null
  loadFailed: boolean
}

function LandingView({
  query,
  onQueryChange,
  onSearch,
  onUseLocation,
  searching,
  locating,
  error,
  geoNote,
  loadFailed,
}: LandingViewProps) {
  return (
    <div className="hero-wash flex min-h-[calc(100dvh-3.25rem)] flex-col">
      <main className="mx-auto flex w-full max-w-[46rem] flex-1 flex-col items-center justify-center px-5 py-14 text-center sm:py-20 md:py-24">
        <WaveMark className="h-7 w-16 text-energy" title="Shiftwave line-wave mark" />
        <h1 className="mt-7 font-display text-[2.2rem] font-semibold leading-[1.3] tracking-normal text-ink sm:text-5xl md:text-[3.35rem]">
          Where Can I <em className="font-semibold italic">Try</em> Shiftwave?
        </h1>
        <p className="mt-4 max-w-md text-[1.05rem] leading-relaxed text-ink-soft sm:max-w-lg sm:text-lg">
          Find a public try-spot near you — full-body pulsed pressure and guided breathwork.
        </p>

        <div className="search-aura mt-11 w-full sm:mt-12">
          <SearchBar
            variant="hero"
            query={query}
            onQueryChange={onQueryChange}
            onSearch={onSearch}
            onUseLocation={onUseLocation}
            searching={searching}
            locating={locating}
          />
        </div>

        {(error || geoNote || loadFailed) && (
            <p className="mt-5 max-w-md text-sm text-ink-soft" role="status">
            {error ||
              geoNote ||
              'Locations didn’t load. Check that locations.json is present, or that VITE_LOCATIONS_URL points at the live sheet export.'}
          </p>
        )}
      </main>

      <footer className="px-5 py-6 text-center text-sm text-ink-faint">
        Pins are qualified public try-spots only — not every purchaser.
      </footer>
    </div>
  )
}

type ResultsViewProps = {
  query: string
  onQueryChange: (value: string) => void
  onSearch: (query: string) => void
  onUseLocation: () => void
  onReset: () => void
  searching: boolean
  locating: boolean
  error: string | null
  geoNote: string | null
  resultLabel: string
  radius: number
  onRadius: (miles: number) => void
  loadFailed: boolean
  noQualified: boolean
  emptyNearby: boolean
  originLabel?: string
  list: RankedLocation[]
  ranked: RankedLocation[]
  origin: GeocodeResult | null
  selectedId: string | null
  hoveredId: string | null
  focus: MapFocus
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onSelectPin: (id: string) => void
}

function ResultsView({
  query,
  onQueryChange,
  onSearch,
  onUseLocation,
  onReset,
  searching,
  locating,
  error,
  geoNote,
  resultLabel,
  radius,
  onRadius,
  loadFailed,
  noQualified,
  emptyNearby,
  originLabel,
  list,
  ranked,
  origin,
  selectedId,
  hoveredId,
  focus,
  onSelect,
  onHover,
  onSelectPin,
}: ResultsViewProps) {
  return (
    <>
      <header className="results-chrome">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3 px-5 py-3 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="focus-ring flex min-w-0 items-center gap-2.5 rounded-full text-left text-energy"
              onClick={onReset}
            >
              <WaveMark className="h-5 w-12 shrink-0" title="Shiftwave line-wave mark" />
              <span className="font-display text-[0.98rem] font-semibold leading-[1.3] tracking-normal text-ink sm:text-xl">
                <span className="sm:hidden">Try Shiftwave</span>
                <span className="hidden sm:inline">
                  Where Can I <em className="font-semibold italic">Try</em> Shiftwave?
                </span>
              </span>
            </button>
            <button
              type="button"
              className="focus-ring shrink-0 rounded-full border border-line bg-cream px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-deep"
              onClick={onReset}
            >
              New search
            </button>
          </div>
          <SearchBar
            variant="compact"
            query={query}
            onQueryChange={onQueryChange}
            onSearch={onSearch}
            onUseLocation={onUseLocation}
            searching={searching}
            locating={locating}
          />
        </div>
      </header>

      <main className="reveal mx-auto grid max-w-[1100px] gap-5 overflow-x-hidden px-4 py-5 sm:px-5 sm:py-6 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:items-start md:gap-7 md:px-8 md:py-8 lg:gap-8">
        <section id="results" className="order-2 min-w-0 md:order-1">
          <div className="mb-4 sm:mb-5">
            <h2 className="font-display text-[1.45rem] font-semibold leading-[1.3] tracking-normal text-ink sm:text-[1.7rem]">
              {resultLabel}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-sm text-ink-faint">Within</span>
              {NEARBY_RADIUS_OPTIONS.map((miles) => (
                <button
                  key={miles}
                  type="button"
                  className="radius-chip focus-ring"
                  onClick={() => onRadius(miles)}
                  aria-pressed={radius === miles}
                >
                  {miles} mi
                </button>
              ))}
            </div>
          </div>

          {(error || geoNote) && (
            <p className="mb-4 text-sm text-ink-soft" role="status">
              {error || geoNote}
            </p>
          )}

          {loadFailed && (
            <EmptyState
              title="Locations didn’t load"
              body="Check that locations.json is present, or that VITE_LOCATIONS_URL points at the live sheet export."
            />
          )}

          {emptyNearby && (
            <div className="mb-4">
              <EmptyState
                title="Nothing public nearby — yet"
                body={`We don’t have a qualified walk-in try-spot within ${radius} miles of ${originLabel}. These are the closest qualified locations on the live partner list.`}
              />
            </div>
          )}

          {noQualified && (
            <EmptyState
              title="No qualified locations"
              body="Every public pin must be marked qualified, public-facing, demo-consenting, and walk-in appropriate."
            />
          )}

          {emptyNearby && (
            <p className="mb-2 text-sm font-medium text-ink-faint">Closest try-spots</p>
          )}

          <ul className="place-list place-panel">
            {list.map((place) => (
              <li key={place.id}>
                <LocationCard
                  place={place}
                  active={place.id === selectedId}
                  onSelect={() => onSelect(place.id)}
                  onHover={onHover}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="order-1 min-h-[220px] min-w-0 overflow-hidden h-[36vh] sm:h-[42vh] sm:min-h-[280px] md:sticky md:top-32 md:order-2 md:h-[calc(100dvh-9.5rem)] md:min-h-[28rem] md:aspect-auto">
          <MapCanvas
            locations={ranked}
            origin={origin}
            selectedId={selectedId}
            hoveredId={hoveredId}
            focus={focus}
            onSelect={onSelectPin}
            onHover={onHover}
          />
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-5 py-8 text-sm text-ink-faint md:flex-row md:items-center md:justify-between md:px-8">
          <p>Pins are qualified public try-spots only — not every purchaser.</p>
          <p>
            Map {origin ? `centered on ${origin.label}` : 'of the United States'} · {ranked.length} listed
          </p>
        </div>
      </footer>
    </>
  )
}

function matchesState(place: LocationRecord, state?: string): boolean {
  if (!state) return false
  if (statesMatch(place.state, state)) return true
  return formatAddress(place).toLowerCase().includes(state.trim().toLowerCase())
}
