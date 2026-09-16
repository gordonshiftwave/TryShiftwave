import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { escapeHtml } from '../lib/format'
import { applyCamera, loadPaperMapStyle, US_CENTER, US_ZOOM } from '../lib/mapStyle'
import type { CameraTarget, LocatedPlace, SearchOrigin } from '../types/location'
import 'maplibre-gl/dist/maplibre-gl.css'

type LocationMapProps = {
  places: LocatedPlace[]
  origin: SearchOrigin | null
  selectedId: string | null
  hoveredId: string | null
  camera: CameraTarget
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
}

function pinElement(
  place: LocatedPlace,
  selected: boolean,
  hovered: boolean,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'try-pin'
  button.dataset.selected = selected ? 'true' : 'false'
  button.dataset.hovered = hovered ? 'true' : 'false'
  button.setAttribute('aria-label', place.name)
  button.innerHTML = '<span class="try-pin-core"></span>'
  return button
}

function originElement(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'try-origin'
  el.innerHTML = '<div class="try-origin-dot"></div>'
  el.setAttribute('aria-label', 'Search origin')
  return el
}

export function LocationMap({
  places,
  origin,
  selectedId,
  hoveredId,
  camera,
  onSelect,
  onHover,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const originMarkerRef = useRef<maplibregl.Marker | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const onSelectRef = useRef(onSelect)
  const onHoverRef = useRef(onHover)
  const cameraRef = useRef(camera)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    onSelectRef.current = onSelect
    onHoverRef.current = onHover
    cameraRef.current = camera
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    let map: MapLibreMap | undefined
    let resizeObserver: ResizeObserver | undefined
    const markers = markersRef.current

    const setup = async () => {
      const style = await loadPaperMapStyle()
      if (cancelled || !containerRef.current) return

      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: US_CENTER,
        zoom: US_ZOOM,
        attributionControl: { compact: true },
      })
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'bottom-right',
      )
      mapRef.current = map
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        offset: 18,
        className: 'try-popup-wrap',
        maxWidth: '220px',
      })

      map.on('load', () => {
        map?.resize()
        applyCamera(map as MapLibreMap, cameraRef.current)
        setMapReady(true)
      })
      map.on('click', (event) => {
        const target = event.originalEvent.target
        if (target instanceof Element && target.closest('.try-pin')) return
        onSelectRef.current(null)
      })

      resizeObserver = new ResizeObserver(() => map?.resize())
      resizeObserver.observe(containerRef.current)
    }

    void setup()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      markers.forEach((marker) => marker.remove())
      markers.clear()
      originMarkerRef.current?.remove()
      originMarkerRef.current = null
      popupRef.current?.remove()
      map?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const ids = new Set(places.map((place) => place.id))
    for (const [id, marker] of markersRef.current) {
      if (!ids.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    }

    for (const place of places) {
      let marker = markersRef.current.get(place.id)
      if (!marker) {
        const el = pinElement(place, place.id === selectedId, place.id === hoveredId)
        el.addEventListener('click', (event) => {
          event.stopPropagation()
          onSelectRef.current(place.id)
        })
        el.addEventListener('mouseenter', () => onHoverRef.current(place.id))
        el.addEventListener('mouseleave', () => onHoverRef.current(null))
        marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([place.lng, place.lat])
          .addTo(map)
        markersRef.current.set(place.id, marker)
      } else {
        marker.setLngLat([place.lng, place.lat])
      }
    }
  }, [places, selectedId, hoveredId, mapReady])

  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const el = marker.getElement()
      el.dataset.selected = id === selectedId ? 'true' : 'false'
      el.dataset.hovered = id === hoveredId ? 'true' : 'false'
    }
  }, [selectedId, hoveredId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    originMarkerRef.current?.remove()
    originMarkerRef.current = null
    if (!origin) return
    originMarkerRef.current = new maplibregl.Marker({
      element: originElement(),
      anchor: 'center',
    })
      .setLngLat([origin.lng, origin.lat])
      .addTo(map)
  }, [origin, mapReady])

  useEffect(() => {
    const map = mapRef.current
    const popup = popupRef.current
    if (!map || !popup || !mapReady) return
    const place = places.find((item) => item.id === selectedId)
    if (!place) {
      popup.remove()
      return
    }
    const cityLine = [place.city, place.state].filter(Boolean).join(', ')
    popup
      .setLngLat([place.lng, place.lat])
      .setHTML(
        `<p style="font-family:Fraunces,serif;font-size:16px;margin:0 0 2px">${escapeHtml(place.name)}</p>
         <p style="margin:0;font-size:13px;color:#5a534b">${escapeHtml(cityLine)}</p>`,
      )
      .addTo(map)
  }, [selectedId, places, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    applyCamera(map, camera)
  }, [camera, mapReady])

  return (
    <div className="surface-card relative overflow-hidden">
      <div
        ref={containerRef}
        className="map-frame h-[min(58vh,420px)] w-full lg:h-[min(720px,calc(100vh-12rem))]"
        role="region"
        aria-label="Map of Shiftwave try-spots"
      />
      <p className="pointer-events-none absolute top-4 left-4 rounded-full border border-line bg-cream/90 px-3 py-1 text-xs tracking-wide text-ink-soft uppercase">
        Qualified demos
      </p>
    </div>
  )
}
