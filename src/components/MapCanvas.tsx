import { useEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import * as maplibregl from 'maplibre-gl'
import { setWorkerUrl } from 'maplibre-gl'
import type { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'
import type { Feature, Polygon, MultiPolygon } from 'geojson'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { CONUS_BOUNDS, pinKind, type Coord, type RankedLocation } from '../types'
import { prefersReducedMotion } from '../geo/distance'
import { coordinateKey, groupByCoordinate } from '../geo/groups'
import { addStateLayers, applyPaperTheme, boundsFromPositions } from '../geo/mapStyle'
import { PlaceFacts } from './PlaceFacts'
import { visitorCopy } from '../copy/visitor'

// Vite includes `base` (GitHub Pages `/TryShiftwave/`, or `VITE_BASE`) in this worker URL.
const resolvedWorker = workerUrl.startsWith('/') || /^[a-z]+:/i.test(workerUrl)
  ? workerUrl
  : `${import.meta.env.BASE_URL}${workerUrl.replace(/^\.\//, '')}`
setWorkerUrl(resolvedWorker.endsWith('.mjs') ? resolvedWorker : `${resolvedWorker}#.mjs`)


export type MapFocus =
  | { type: 'us' }
  | { type: 'fit'; coords: Coord[] }
  | { type: 'pin'; coord: Coord }

type MapCanvasProps = {
  locations: RankedLocation[]
  origin: Coord | null
  selectedId: string | null
  hoveredId: string | null
  focus: MapFocus
  popupId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onPopupClose: () => void
}

export function MapCanvas({
  locations,
  origin,
  selectedId,
  hoveredId,
  focus,
  popupId,
  onSelect,
  onHover,
  onPopupClose,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Map<string, Marker>>(new Map())
  const originMarkerRef = useRef<Marker | null>(null)
  const hoverStateRef = useRef<number | string | null>(null)
  const selectedIdRef = useRef(selectedId)
  const onSelectRef = useRef(onSelect)
  const onHoverRef = useRef(onHover)
  const onPopupCloseRef = useRef(onPopupClose)
  selectedIdRef.current = selectedId
  onSelectRef.current = onSelect
  onHoverRef.current = onHover
  onPopupCloseRef.current = onPopupClose

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

    const groups = groupByCoordinate(locations)
    const keep = new Set(groups.map((group) => coordinateKey(group[0].lat, group[0].lng)))
    markersRef.current.forEach((marker, id) => {
      if (!keep.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    })

    for (const group of groups) {
      const key = coordinateKey(group[0].lat, group[0].lng)
      let marker = markersRef.current.get(key)
      if (!marker) {
        const el = pinElement(group)
        el.addEventListener('click', (event) => {
          event.stopPropagation()
          const ids = (el.dataset.ids ?? '').split(',').filter(Boolean)
          const current = selectedIdRef.current
          const pick = current && ids.includes(current) ? current : ids[0]
          if (pick) onSelectRef.current(pick)
        })
        el.addEventListener('mouseenter', () => {
          const ids = (el.dataset.ids ?? '').split(',').filter(Boolean)
          onHoverRef.current(ids[0] ?? null)
        })
        el.addEventListener('mouseleave', () => onHoverRef.current(null))
        marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([
          group[0].lng,
          group[0].lat,
        ])
        marker.addTo(map)
        markersRef.current.set(key, marker)
      }
      const el = marker.getElement()
      syncPinContent(el, group)
      syncPinState(
        el,
        group.some((place) => place.id === selectedId),
        group.some((place) => place.id === hoveredId),
      )
    }
  }, [locations, selectedId, hoveredId])

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
    if (!map || !popupId) return
    const place = locations.find((row) => row.id === popupId)
    if (!place) return
    const group =
      groupByCoordinate(locations).find((rows) => rows.some((row) => row.id === popupId)) ?? [place]
    const container = document.createElement('div')
    const root: Root = createRoot(container)
    root.render(
      <div className="pin-card">
        {group.length > 1 && <p className="pin-card__count">{visitorCopy.placesHere(group.length)}</p>}
        {group.map((row) => (
          <div
            key={row.id}
            className={row.id === popupId ? 'pin-card__place is-selected' : 'pin-card__place'}
          >
            <PlaceFacts
              place={row}
              origin={origin}
              detailed
              showName
              onChoose={(id) => onSelectRef.current(id)}
            />
          </div>
        ))}
      </div>,
    )
    let closedByUs = false
    const popup: Popup = new maplibregl.Popup({
      offset: 18,
      maxWidth: '280px',
      closeButton: true,
      closeOnClick: false,
      closeOnMove: false,
      className: 'sw-popup',
      focusAfterOpen: false,
    })
      .setLngLat([place.lng, place.lat])
      .setDOMContent(container)
      .addTo(map)
    popup.on('close', () => {
      if (closedByUs) return
      onPopupCloseRef.current()
    })
    return () => {
      closedByUs = true
      popup.remove()
      // Unmount on the next turn so this cleanup does not run inside a React render.
      window.setTimeout(() => root.unmount(), 0)
    }
  }, [popupId, locations, origin])

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
    <div className="map-shell paper-card relative h-full w-full min-h-[240px] max-w-full p-1.5 md:min-h-[480px]">
      <div
        ref={containerRef}
        className="h-full w-full min-h-[228px] max-w-full rounded-[16px] md:min-h-[468px]"
      />
    </div>
  )
}

function pinElement(group: RankedLocation[]): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `sw-pin sw-pin--${pinKind(group[0].category)}`
  button.innerHTML = `<svg class="sw-pin__glyph" viewBox="0 0 28 28" aria-hidden="true">
    <path class="sw-pin__shape" d="M14 2.5c-5.2 0-9.4 4.1-9.4 9.2 0 6.6 9.4 14 9.4 14s9.4-7.4 9.4-14c0-5.1-4.2-9.2-9.4-9.2z"/>
    <circle class="sw-pin__dot" cx="14" cy="11.2" r="3.15"/>
  </svg>`
  syncPinContent(button, group)
  return button
}

function syncPinContent(button: HTMLElement, group: RankedLocation[]): void {
  const names = group.map((place) => place.name).join(', ')
  button.setAttribute('aria-label', group.length > 1 ? `${group.length} places: ${names}` : group[0].name)
  button.dataset.ids = group.map((place) => place.id).join(',')
  let badge = button.querySelector('.sw-pin__count')
  if (group.length > 1) {
    if (!badge) {
      badge = document.createElement('span')
      badge.className = 'sw-pin__count'
      button.appendChild(badge)
    }
    badge.textContent = String(group.length)
  } else {
    badge?.remove()
  }
}

function syncPinState(el: HTMLElement, active: boolean, hover: boolean): void {
  el.classList.toggle('is-active', active)
  el.classList.toggle('is-hover', hover && !active)
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
