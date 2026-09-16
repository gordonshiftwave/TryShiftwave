import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { DemoBanner } from './components/DemoBanner'
import { SiteFooter } from './components/Footer'
import { LocationList } from './components/LocationList'
import { SearchPanel } from './components/SearchPanel'
import { StateChips } from './components/StateChips'
import { WaveMark } from './components/WaveMark'
import { findState, stateBounds, US_STATES } from './data/usStates'
import { loadLocations } from './data/loadLocations'
import { filterPlaces, withDistances } from './lib/filterPlaces'
import {
  geocodeQuery,
  geolocationErrorMessage,
  originFromGeolocation,
} from './lib/geocode'
import type {
  CameraTarget,
  LocationRecord,
  RadiusMiles,
  SearchOrigin,
} from './types/location'

const LocationMap = lazy(async () => {
  const mod = await import('./components/LocationMap')
  return { default: mod.LocationMap }
})

function boundsFor(
  origin: SearchOrigin | null,
  places: { lat: number; lng: number }[],
): CameraTarget {
  const points = [
    ...(origin ? [{ lat: origin.lat, lng: origin.lng }] : []),
    ...places,
  ]
  if (points.length === 0) return { type: 'us' }
  if (points.length === 1) {
    return { type: 'point', lat: points[0].lat, lng: points[0].lng, zoom: 11 }
  }
  let west = points[0].lng
  let south = points[0].lat
  let east = points[0].lng
  let north = points[0].lat
  for (const point of points) {
    west = Math.min(west, point.lng)
    south = Math.min(south, point.lat)
    east = Math.max(east, point.lng)
    north = Math.max(north, point.lat)
  }
  if (east - west < 0.01 && north - south < 0.01) {
    return { type: 'point', lat: points[0].lat, lng: points[0].lng, zoom: 11 }
  }
  return {
    type: 'bounds',
    bounds: [
      [west, south],
      [east, north],
    ],
  }
}

export default function App() {
  const [all, setAll] = useState<LocationRecord[]>([])
  const [source, setSource] = useState<'demo' | 'sheet'>('demo')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [radius, setRadius] = useState<RadiusMiles>(50)
  const [origin, setOrigin] = useState<SearchOrigin | null>(null)
  const [stateFilter, setStateFilter] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadLocations()
      .then((result) => {
        if (cancelled) return
        setAll(result.locations)
        setSource(result.source)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Locations could not be loaded. Refresh to try again.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const located = useMemo(() => withDistances(all, origin), [all, origin])
  const visible = useMemo(
    () => filterPlaces(located, { origin, radius, stateFilter }),
    [located, origin, radius, stateFilter],
  )

  const stateCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const place of all) {
      counts.set(place.state, (counts.get(place.state) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([abbr, count]) => ({
        abbr,
        count,
        name: US_STATES.find((state) => state.abbr === abbr)?.name ?? abbr,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [all])

  const selectedPlace = visible.find((place) => place.id === selectedId) ?? null

  const camera = useMemo((): CameraTarget => {
    if (selectedPlace) {
      return {
        type: 'point',
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        zoom: 12.2,
      }
    }
    if (stateFilter) {
      const state = US_STATES.find((item) => item.abbr === stateFilter)
      if (state) return { type: 'bounds', bounds: stateBounds(state), padding: 56 }
    }
    if (origin) return boundsFor(origin, visible)
    return { type: 'us' }
  }, [origin, selectedPlace, stateFilter, visible])

  const applyOrigin = (next: SearchOrigin, nextState: string | null = null) => {
    setOrigin(next)
    setStateFilter(nextState)
    setSelectedId(null)
    setError(null)
  }

  const handleSearch = async () => {
    setSearching(true)
    setError(null)
    const result = await geocodeQuery(query)
    setSearching(false)
    if (result.ok === false) {
      setError(result.message)
      return
    }
    applyOrigin(result.origin, result.state?.abbr ?? null)
  }

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('This browser cannot share a location. Try a ZIP instead.')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        setQuery('')
        applyOrigin(originFromGeolocation(position.coords))
      },
      (geoError) => {
        setLocating(false)
        setError(geolocationErrorMessage(geoError))
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 },
    )
  }

  const handleState = (abbr: string | null) => {
    setStateFilter(abbr)
    setSelectedId(null)
    setError(null)
  }

  const handleSelect = (id: string | null) => {
    setSelectedId(id)
  }

  const radiusLabel = radius === 'any' ? 'any distance' : `${radius} miles`
  const hasQueryContext = Boolean(origin || stateFilter)

  let heading = 'Qualified try-spots'
  let subheading =
    'Search a ZIP or use your location to sort by distance. Browse a state to zoom the map.'
  let emptyTitle = 'No try-spots to show'
  let emptyBody =
    'Coverage is growing city by city. Try another ZIP, a wider radius, or browse a state that already has a host.'

  if (stateFilter) {
    const name = findState(stateFilter)?.name ?? stateFilter
    heading = `${visible.length} ${visible.length === 1 ? 'place' : 'places'} in ${name}`
    subheading = origin
      ? `Sorted from ${origin.label}.`
      : 'All qualified public hosts in this state.'
    emptyTitle = `No try-spots in ${name} yet`
    emptyBody =
      'We’re still filling in the map. Search a nearby ZIP, or show the nearest locations nationwide.'
  } else if (origin) {
    heading =
      radius === 'any'
        ? `${visible.length} ${visible.length === 1 ? 'place' : 'places'}, nearest first`
        : `${visible.length} ${visible.length === 1 ? 'place' : 'places'} within ${radiusLabel} of ${origin.label}`
    subheading = 'Tap a card or a pin — the list and map stay in sync.'
    emptyTitle = `No try-spots within ${radiusLabel} of ${origin.label}`
    emptyBody =
      'Shiftwave coverage is still spreading. Widen the radius, try a nearby city, or look at the nearest hosts anywhere in the U.S.'
  }

  return (
    <div className="paper-wash relative min-h-svh lg:h-svh lg:overflow-hidden">
      <div className="paper-grain" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-svh w-full max-w-[1180px] flex-col px-4 pt-6 pb-4 sm:px-6 lg:h-svh">
        <header className="mb-5 flex shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rise">
            <WaveMark className="h-8 w-8" />
            <p className="font-display text-lg tracking-wide text-ink-soft italic">
              Shiftwave
            </p>
          </div>
          <p className="hidden text-sm text-ink-faint sm:block">In-person demos</p>
        </header>

        <section className="max-w-3xl shrink-0">
          <p className="text-xs font-medium tracking-[0.22em] text-ink-faint uppercase">
            Find a session nearby
          </p>
          <h1 className="font-display mt-2 text-[clamp(2rem,4.6vw,3.15rem)] leading-[1.08] font-medium tracking-[-0.02em] text-ink">
            Where Can I Try Shiftwave?
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Pulsed pressure and guided breathwork, in person — at qualified studios,
            clinics, and gyms. Search a ZIP, use your location, or browse a state.
          </p>
        </section>

        <div className="mt-5 flex shrink-0 flex-col gap-3">
          <DemoBanner source={source} />
          {loadError ? (
            <p className="text-sm text-fall" role="alert">
              {loadError}
            </p>
          ) : null}
          <SearchPanel
            query={query}
            radius={radius}
            searching={searching}
            locating={locating}
            error={error}
            onQueryChange={setQuery}
            onRadiusChange={setRadius}
            onSearch={() => void handleSearch()}
            onUseLocation={handleUseLocation}
          />
          <StateChips
            states={stateCounts}
            active={stateFilter}
            onSelect={handleState}
          />
        </div>

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:overflow-hidden">
          <div className="order-2 min-h-0 lg:order-1 lg:overflow-hidden">
            {all.length === 0 && !loadError ? (
              <div className="surface-card px-5 py-10 text-sm text-ink-soft">
                Loading try-spots…
              </div>
            ) : (
              <LocationList
                places={visible}
                selectedId={selectedId}
                heading={heading}
                subheading={subheading}
                emptyTitle={emptyTitle}
                emptyBody={emptyBody}
                onSelect={(id) => handleSelect(id)}
                onHover={setHoveredId}
                onWiden={() => setRadius(250)}
                onNearest={() => {
                  setRadius('any')
                  setStateFilter(null)
                }}
                showEmptyActions={hasQueryContext}
              />
            )}
          </div>
          <div className="order-1 min-h-0 lg:order-2">
            <Suspense
              fallback={
                <div className="surface-card flex h-[min(52vh,380px)] items-center justify-center text-sm text-ink-soft lg:h-full">
                  Loading map…
                </div>
              }
            >
              <LocationMap
                places={visible}
                origin={origin}
                selectedId={selectedId}
                hoveredId={hoveredId}
                camera={camera}
                onSelect={handleSelect}
                onHover={setHoveredId}
              />
            </Suspense>
          </div>
        </div>

        <div className="shrink-0">
          <SiteFooter />
        </div>
      </div>
    </div>
  )
}
