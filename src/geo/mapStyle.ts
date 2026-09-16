import type { LngLatBoundsLike, Map as MapLibreMap } from 'maplibre-gl'
import { tokens } from '../theme/tokens'

/** Recolor OpenFreeMap Positron to a quiet paper basemap so peach-warm pins pop. */
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

  set('background', 'background-color', tokens.paper)
  set('park', 'fill-color', '#e8ebe6')
  set('water', 'fill-color', '#e0e4e6')
  set('waterway', 'line-color', '#cdd3d6')
  set('landcover_ice_shelf', 'fill-color', '#f3f1ee')
  set('landcover_glacier', 'fill-color', '#eeeae4')
  set('landuse_residential', 'fill-color', tokens.paperDeep)
  set('landcover_wood', 'fill-color', '#e3e6e1')
  set('building', 'fill-color', '#ebe8e2')
  set('building', 'fill-outline-color', tokens.line)
  set('road_area_pier', 'fill-color', tokens.paper)
  set('road_pier', 'line-color', tokens.paper)
  set('highway_path', 'line-color', '#e8e5df')
  set('highway_minor', 'line-color', '#e9e6e0')
  set('highway_major_casing', 'line-color', tokens.line)
  set('highway_major_inner', 'line-color', tokens.white)
  set('highway_major_subtle', 'line-color', '#e6e3dd')
  set('highway_motorway_casing', 'line-color', '#ddd9d2')
  set('highway_motorway_inner', 'line-color', '#f3f1ec')
  set('highway_motorway_subtle', 'line-color', '#e2ded7')
  set('highway_motorway_bridge_casing', 'line-color', '#ddd9d2')
  set('highway_motorway_bridge_inner', 'line-color', '#f3f1ec')
  set('railway', 'line-color', tokens.line)
  set('railway_transit', 'line-color', '#e2ded7')
  set('railway_service', 'line-color', '#e2ded7')
  set('boundary_2', 'line-color', '#d0ccc4')
  set('boundary_3', 'line-color', '#dcd8d1')
  set('boundary_disputed', 'line-color', '#d4d0c8')

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
    set(id, 'text-color', tokens.inkFaint)
    set(id, 'text-halo-color', tokens.paper)
  }
  set('water_name_point_label', 'text-color', tokens.inkFaint)
  set('water_name_line_label', 'text-color', tokens.inkFaint)
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
        'fill-color': tokens.peachWarm,
        'fill-opacity': 0.08,
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
        'line-color': tokens.peachDeep,
        'line-width': 0.7,
        'line-opacity': 0.28,
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
        'fill-color': tokens.peachWarm,
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.14, 0],
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
