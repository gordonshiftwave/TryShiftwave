import type { LngLatBoundsLike, Map as MapLibreMap } from 'maplibre-gl'

/** Recolor OpenFreeMap Positron: paper ground, sky water, sage parks — low-arousal, not grey chrome. */
export function applyPaperTheme(map: MapLibreMap): void {
  const set = (layer: string, prop: string, value: unknown) => {
    if (!map.getLayer(layer)) return
    try {
      const setPaint = map.setPaintProperty.bind(map) as (
        layer: string,
        prop: string,
        value: unknown,
      ) => void
      setPaint(layer, prop, value)
    } catch {
      /* layer may not accept the property */
    }
  }

  set('background', 'background-color', '#f4efe6')
  set('park', 'fill-color', '#dce6db')
  set('water', 'fill-color', '#c5d9e4')
  set('waterway', 'line-color', '#a9c2d0')
  set('landcover_ice_shelf', 'fill-color', '#eef3f0')
  set('landcover_glacier', 'fill-color', '#e7eeea')
  set('landuse_residential', 'fill-color', '#efe7d9')
  set('landcover_wood', 'fill-color', '#cfdcd4')
  set('building', 'fill-color', '#e9e2d6')
  set('building', 'fill-outline-color', '#ddd4c6')
  set('road_area_pier', 'fill-color', '#f4efe6')
  set('road_pier', 'line-color', '#f4efe6')
  set('highway_path', 'line-color', '#e8e0d3')
  set('highway_minor', 'line-color', '#e9e1d4')
  set('highway_major_casing', 'line-color', '#e0d7c9')
  set('highway_major_inner', 'line-color', '#fbf8f2')
  set('highway_major_subtle', 'line-color', '#e6ddd0')
  set('highway_motorway_casing', 'line-color', '#d8d0c3')
  set('highway_motorway_inner', 'line-color', '#f3ece1')
  set('highway_motorway_subtle', 'line-color', '#ddd4c6')
  set('highway_motorway_bridge_casing', 'line-color', '#d8d0c3')
  set('highway_motorway_bridge_inner', 'line-color', '#f3ece1')
  set('railway', 'line-color', '#ddd4c6')
  set('railway_transit', 'line-color', '#e2dacd')
  set('railway_service', 'line-color', '#e2dacd')
  set('boundary_2', 'line-color', '#cfc6b8')
  set('boundary_3', 'line-color', '#d9d0c2')
  set('boundary_disputed', 'line-color', '#d4cbbd')

  const labelLayers = [
    'waterway_line_label',
    'water_name_point_label',
    'water_name_line_label',
    'highway-name-path',
    'highway-name-minor',
    'highway-name-major',
    'airport',
    'label_other',
    'label_village',
    'label_town',
    'label_state',
    'label_city',
    'label_city_capital',
    'label_country_3',
    'label_country_2',
    'label_country_1',
  ]
  for (const id of labelLayers) {
    set(id, 'text-color', '#5a534b')
    set(id, 'text-halo-color', '#fbf8f2')
  }
  set('water_name_point_label', 'text-color', '#3e6574')
  set('water_name_line_label', 'text-color', '#3e6574')
}

export function addStateLayers(map: MapLibreMap): void {
  if (map.getSource('us-states')) return

  map.addSource('us-states', {
    type: 'geojson',
    data: '/us-states.json',
    generateId: true,
  })

  const before =
    (map.getLayer('boundary_2') ? 'boundary_2' : undefined) ?? firstSymbolLayerId(map)

  map.addLayer(
    {
      id: 'state-fill',
      type: 'fill',
      source: 'us-states',
      maxzoom: 5.8,
      paint: {
        'fill-color': '#9fbe99',
        'fill-opacity': 0.1,
      },
    },
    before,
  )

  map.addLayer(
    {
      id: 'state-line',
      type: 'line',
      source: 'us-states',
      maxzoom: 6.2,
      paint: {
        'line-color': '#3d6d62',
        'line-width': 0.65,
        'line-opacity': 0.32,
      },
    },
    before,
  )

  map.addLayer(
    {
      id: 'state-hover',
      type: 'fill',
      source: 'us-states',
      maxzoom: 5.8,
      paint: {
        'fill-color': '#b7d3e3',
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.24, 0],
      },
    },
    'state-line',
  )
}

function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id
}

export function boundsFromPositions(
  positions: Array<{ lat: number; lng: number }>,
): LngLatBoundsLike | null {
  if (positions.length === 0) return null
  let minLng = positions[0].lng
  let maxLng = positions[0].lng
  let minLat = positions[0].lat
  let maxLat = positions[0].lat
  for (const p of positions) {
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
  }
  if (minLng === maxLng && minLat === maxLat) {
    return [
      [minLng - 0.18, minLat - 0.12],
      [maxLng + 0.18, maxLat + 0.12],
    ]
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}
