import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import { setWorkerUrl } from 'maplibre-gl'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { Feature, Polygon, MultiPolygon } from 'geojson'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { CONUS_BOUNDS, type Coord, type RankedLocation } from '../types'
import { prefersReducedMotion } from '../geo/distance'
import { addStateLayers, applyPaperTheme, boundsFromPositions } from '../geo/mapStyle'

setWorkerUrl(workerUrl.endsWith('.mjs') ? workerUrl : `${workerUrl}#.mjs`)

export type MapFocus =
  | { type: 'us' }
  | { type: 'fit'; coords: Coord[] }
  | { type: 'pin'; coord: Coord }

type MapCanvasProps = {
  locations: RankedLocation[]
  origin: Coord | null
  selectedId: string | null
  hoveredId: string | null
  nearestId?: string | null
  focus: MapFocus
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

export function MapCanvas({
  locations,
  origin,
  selectedId,
  hoveredId,
  nearestId = null,
  focus,
  onSelect,
  onHover,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Map<string, Marker>>(new Map())
  const originMarkerRef = useRef<Marker | null>(null)
  const hoverStateRef = useRef<number | string | null>(null)
  const onSelectRef = useRef(onSelect)
  const onHoverRef = useRef(onHover)
  onSelectRef.current = onSelect
  onHoverRef.current = onHover

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      bounds: CONUS_BOUNDS,
      fitBoundsOptions: { padding: 28 },
      attributionControl: { compact: true },
      cooperativeGestures: true,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.dragRotate.disable()
    map.touchPitch.disable()
    mapRef.current = map

    map.on('load', () => {
      applyPaperTheme(map)
      addStateLayers(map)
    })

    map.on('mouseenter', 'state-fill', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'state-fill', () => {
      map.getCanvas().style.cursor = ''
      if (hoverStateRef.current != null) {
        map.setFeatureState({ source: 'us-states', id: hoverStateRef.current }, { hover: false })
        hoverStateRef.current = null
      }
    })
    map.on('mousemove', 'state-fill', (event) => {
      const feature = event.features?.[0]
      const id = feature?.id
      if (id == null) return
      if (hoverStateRef.current != null && hoverStateRef.current !== id) {
        map.setFeatureState({ source: 'us-states', id: hoverStateRef.current }, { hover: false })
      }
      hoverStateRef.current = id
      map.setFeatureState({ source: 'us-states', id }, { hover: true })
    })
    map.on('click', 'state-fill', (event) => {
      const feature = event.features?.[0] as Feature<Polygon | MultiPolygon> | undefined
      if (!feature?.geometry) return
      const b = boundsOfGeometry(feature.geometry)
      if (!b) return
      const duration = prefersReducedMotion() ? 0 : 900
      map.fitBounds(b, { padding: 48, duration, maxZoom: 6.2 })
    })

    const resize = () => map.resize()
    const observer = new ResizeObserver(resize)
    observer.observe(containerRef.current)
    window.addEventListener('orientationchange', resize)

    return () => {
      observer.disconnect()
      window.removeEventListener('orientationchange', resize)
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current.clear()
      originMarkerRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const keep = new Set(locations.map((place) => place.id))
    markersRef.current.forEach((marker, id) => {
      if (!keep.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    })

    for (const place of locations) {
      let marker = markersRef.current.get(place.id)
      if (!marker) {
        const el = pinElement(place)
        el.addEventListener('click', (event) => {
          event.stopPropagation()
          onSelectRef.current(place.id)
        })
        el.addEventListener('mouseenter', () => onHoverRef.current(place.id))
        el.addEventListener('mouseleave', () => onHoverRef.current(null))
        marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([
          place.lng,
          place.lat,
        ])
        marker.addTo(map)
        markersRef.current.set(place.id, marker)
      }
      syncPinState(
        marker.getElement(),
        place.id === selectedId,
        place.id === hoveredId,
        place.id === nearestId,
      )
    }
  }, [locations, selectedId, hoveredId, nearestId])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    originMarkerRef.current?.remove()
    originMarkerRef.current = null
    if (!origin) return
    const el = document.createElement('div')
    el.className = 'origin-mark'
    el.setAttribute('aria-hidden', 'true')
    el.innerHTML =
      '<span class="origin-mark__pulse"></span><span class="origin-mark__core"></span>'
    originMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([origin.lng, origin.lat])
      .addTo(map)
  }, [origin])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const duration = prefersReducedMotion() ? 0 : 1100
    if (focus.type === 'us') {
      map.fitBounds(CONUS_BOUNDS, { padding: 28, duration })
      return
    }
    if (focus.type === 'pin') {
      map.easeTo({
        center: [focus.coord.lng, focus.coord.lat],
        zoom: Math.max(map.getZoom(), 11.5),
        duration,
      })
      return
    }
    const bounds = boundsFromPositions(focus.coords)
    if (bounds) {
      map.fitBounds(bounds, { padding: 72, duration, maxZoom: 12.5 })
    }
  }, [focus])

  return (
    <div className="map-shell paper-card relative h-full min-h-[240px] overflow-hidden p-1.5 md:min-h-[480px]">
      <div ref={containerRef} className="h-full min-h-[228px] overflow-hidden rounded-[22px] md:min-h-[468px]" />
    </div>
  )
}

function pinElement(place: RankedLocation): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'sw-pin'
  button.setAttribute('aria-label', place.name)
  button.innerHTML = `<svg class="sw-pin__glyph" viewBox="0 0 28 28" aria-hidden="true">
    <path class="sw-pin__body" d="M14 2.5c-5.2 0-9.4 4.1-9.4 9.2 0 6.6 9.4 14 9.4 14s9.4-7.4 9.4-14c0-5.1-4.2-9.2-9.4-9.2z"/>
    <circle class="sw-pin__core" cx="14" cy="11.2" r="3.15"/>
  </svg>`
  return button
}

function syncPinState(el: HTMLElement, active: boolean, hover: boolean, nearest: boolean): void {
  el.classList.toggle('is-active', active)
  el.classList.toggle('is-hover', hover && !active)
  el.classList.toggle('is-nearest', nearest)
}

function boundsOfGeometry(
  geometry: Polygon | MultiPolygon,
): [[number, number], [number, number]] | null {
  const rings =
    geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat()
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const ring of rings) {
    for (const pair of ring) {
      const lng = pair[0]
      const lat = pair[1]
      minLng = Math.min(minLng, lng)
      minLat = Math.min(minLat, lat)
      maxLng = Math.max(maxLng, lng)
      maxLat = Math.max(maxLat, lat)
    }
  }
  if (!Number.isFinite(minLng)) return null
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}
