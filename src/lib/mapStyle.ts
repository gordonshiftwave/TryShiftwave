import type { StyleSpecification } from 'maplibre-gl'

import type { CameraTarget } from '../types/location'

export const US_CENTER: [number, number] = [-97.5, 39.2]
export const US_ZOOM = 3.55
const CONUS_BOUNDS: [[number, number], [number, number]] = [
  [-125.2, 24.3],
  [-66.4, 49.5],
]

export function applyCamera(
  map: import('maplibre-gl').Map,
  camera: CameraTarget,
): void {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const duration = reduced ? 0 : 900

  if (camera.type === 'us') {
    map.fitBounds(CONUS_BOUNDS, { padding: 28, duration })
    return
  }
  if (camera.type === 'point') {
    map.easeTo({
      center: [camera.lng, camera.lat],
      zoom: camera.zoom,
      duration,
    })
    return
  }

  map.fitBounds(camera.bounds, {
    padding: camera.padding ?? 72,
    duration,
    maxZoom: 12.5,
  })
}

const PAPER = '#f4efe6'
const CREAM = '#fbf8f2'
const SAND = '#efe7d9'
const LINE = '#ddd4c6'
const INK_SOFT = '#5a534b'
const INK = '#1f1c18'
const SKY = '#b7d3e3'
const MIST = '#c8d8d2'
const FOCUS = '#3e6574'

const LAYER_PAINT: Record<string, Record<string, string>> = {
  background: { 'background-color': PAPER },
  park: { 'fill-color': MIST },
  water: { 'fill-color': SKY },
  landcover_ice_shelf: { 'fill-color': CREAM },
  landcover_glacier: { 'fill-color': CREAM },
  landuse_residential: { 'fill-color': SAND },
  landcover_wood: { 'fill-color': '#d4e0d6' },
  waterway: { 'line-color': SKY },
  building: { 'fill-color': '#eee6da', 'fill-outline-color': LINE },
  road_area_pier: { 'fill-color': PAPER },
  road_pier: { 'line-color': PAPER },
  highway_path: { 'line-color': LINE },
  highway_minor: { 'line-color': '#e4dac9' },
  highway_major_casing: { 'line-color': LINE },
  highway_major_inner: { 'line-color': CREAM },
  highway_major_subtle: { 'line-color': LINE },
  highway_motorway_casing: { 'line-color': LINE },
  highway_motorway_subtle: { 'line-color': LINE },
  railway_transit: { 'line-color': LINE },
  railway_transit_dashline: { 'line-color': CREAM },
  railway_service: { 'line-color': LINE },
  railway_service_dashline: { 'line-color': CREAM },
  railway: { 'line-color': LINE },
  railway_dashline: { 'line-color': CREAM },
  highway_motorway_bridge_casing: { 'line-color': LINE },
  boundary_3: { 'line-color': '#c8bdae' },
  boundary_2: { 'line-color': '#c8bdae' },
  boundary_disputed: { 'line-color': '#c8bdae' },
  waterway_line_label: { 'text-color': FOCUS, 'text-halo-color': CREAM },
  water_name_point_label: { 'text-color': FOCUS, 'text-halo-color': CREAM },
  water_name_line_label: { 'text-color': FOCUS, 'text-halo-color': CREAM },
  'highway-name-path': { 'text-color': INK_SOFT, 'text-halo-color': CREAM },
  'highway-name-minor': { 'text-color': INK_SOFT },
  'highway-name-major': { 'text-color': INK_SOFT },
  airport: { 'text-color': INK_SOFT, 'text-halo-color': CREAM },
  label_other: { 'text-color': INK_SOFT, 'text-halo-color': CREAM },
  label_village: { 'text-color': INK, 'text-halo-color': CREAM },
  label_town: { 'text-color': INK, 'text-halo-color': CREAM },
  label_state: { 'text-color': INK_SOFT, 'text-halo-color': CREAM },
  label_city: { 'text-color': INK, 'text-halo-color': CREAM },
  label_city_capital: { 'text-color': INK, 'text-halo-color': CREAM },
  label_country_3: { 'text-color': INK, 'text-halo-color': CREAM },
  label_country_2: { 'text-color': INK, 'text-halo-color': CREAM },
  label_country_1: { 'text-color': INK, 'text-halo-color': CREAM },
}

function recolor(style: StyleSpecification): StyleSpecification {
  const layers = style.layers.map((layer) => {
    const paintUpdates = LAYER_PAINT[layer.id]
    if (!paintUpdates || !('paint' in layer) || !layer.paint) {
      const next = { ...layer }
      if ('paint' in next && next.paint && 'text-halo-color' in next.paint) {
        return {
          ...next,
          paint: { ...next.paint, 'text-halo-color': CREAM },
        }
      }
      return layer
    }
    return {
      ...layer,
      paint: { ...layer.paint, ...paintUpdates },
    }
  })
  return { ...style, layers: layers as StyleSpecification['layers'] }
}

export const RASTER_FALLBACK: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
}

export async function loadPaperMapStyle(): Promise<StyleSpecification> {
  try {
    const response = await fetch('https://tiles.openfreemap.org/styles/positron')
    if (!response.ok) throw new Error('style fetch failed')
    const style = (await response.json()) as StyleSpecification
    style.center = US_CENTER
    style.zoom = US_ZOOM
    return recolor(style)
  } catch {
    return RASTER_FALLBACK
  }
}
