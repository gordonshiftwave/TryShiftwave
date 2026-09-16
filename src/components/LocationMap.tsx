import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import type { DemoLocation, GeoOrigin } from "../types";
import { CONTIGUOUS_US_BOUNDS, prefersReducedMotion } from "../lib/geo";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

type LocationMapProps = {
  locations: DemoLocation[];
  origin: GeoOrigin | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function LocationMap({
  locations,
  origin,
  selectedId,
  onSelect,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const skipSelectionFlyRef = useRef(false);
  const originRef = useRef(origin);
  originRef.current = origin;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      bounds: CONTIGUOUS_US_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      attributionControl: { compact: true },
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    mapRef.current = map;

    map.on("load", async () => {
      if (!originRef.current) {
        map.fitBounds(CONTIGUOUS_US_BOUNDS, { padding: 28, duration: 0 });
      }
      try {
        const res = await fetch("/us-states.json");
        const states = (await res.json()) as FeatureCollection;
        map.addSource("states", {
          type: "geojson",
          data: states,
          generateId: true,
        });
        const beforeId = map
          .getStyle()
          .layers?.find((layer) => layer.type === "symbol")?.id;
        map.addLayer(
          {
            id: "states-fill",
            type: "fill",
            source: "states",
            paint: {
              "fill-color": "#b7d3e3",
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.28,
                0.08,
              ],
            },
          },
          beforeId,
        );
        map.addLayer(
          {
            id: "states-line",
            type: "line",
            source: "states",
            paint: {
              "line-color": "#9fbe99",
              "line-width": 0.8,
              "line-opacity": 0.55,
            },
          },
          beforeId,
        );

        let hovered: string | number | undefined;
        map.on("mousemove", "states-fill", (event) => {
          map.getCanvas().style.cursor = "pointer";
          const id = event.features?.[0]?.id;
          if (hovered !== undefined && hovered !== id) {
            map.setFeatureState({ source: "states", id: hovered }, { hover: false });
          }
          if (id !== undefined) {
            hovered = id;
            map.setFeatureState({ source: "states", id }, { hover: true });
          }
        });
        map.on("mouseleave", "states-fill", () => {
          map.getCanvas().style.cursor = "";
          if (hovered !== undefined) {
            map.setFeatureState({ source: "states", id: hovered }, { hover: false });
            hovered = undefined;
          }
        });
        map.on("click", "states-fill", (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const bbox = getFeatureBBox(feature.geometry);
          if (!bbox) return;
          map.fitBounds(bbox, {
            padding: 48,
            maxZoom: 6.4,
            duration: prefersReducedMotion() ? 0 : 800,
          });
        });
      } catch {
        /* State overlay is optional. Pins still work. */
      }
    });

    const resize = () => map.resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      markersRef.current.forEach((marker) => marker.remove());
      originMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = locations.map((location) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `map-pin${location.id === selectedRef.current ? " is-selected" : ""}`;
      el.dataset.locationId = location.id;
      el.setAttribute("aria-label", location.name);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(location.id);
      });
      return new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([location.lng, location.lat])
        .addTo(map);
    });
  }, [locations]);

  useEffect(() => {
    markersRef.current.forEach((marker) => {
      const el = marker.getElement();
      el.classList.toggle("is-selected", el.dataset.locationId === selectedId);
    });
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    originMarkerRef.current?.remove();
    originMarkerRef.current = null;
    if (!origin) return;

    const el = document.createElement("div");
    el.className = "map-pin is-you";
    el.setAttribute("aria-label", origin.label);
    originMarkerRef.current = new maplibregl.Marker({
      element: el,
      anchor: "center",
    })
      .setLngLat([origin.lng, origin.lat])
      .addTo(map);

    const bounds = new maplibregl.LngLatBounds(
      [origin.lng, origin.lat],
      [origin.lng, origin.lat],
    );
    const nearest = [...locations]
      .sort((a, b) => {
        const da = (a.lat - origin.lat) ** 2 + (a.lng - origin.lng) ** 2;
        const db = (b.lat - origin.lat) ** 2 + (b.lng - origin.lng) ** 2;
        return da - db;
      })
      .slice(0, 4);
    nearest.forEach((location) => bounds.extend([location.lng, location.lat]));
    skipSelectionFlyRef.current = true;
    map.fitBounds(bounds, {
      padding: 72,
      maxZoom: 9.5,
      duration: prefersReducedMotion() ? 0 : 900,
    });
  }, [origin, locations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    if (skipSelectionFlyRef.current) {
      skipSelectionFlyRef.current = false;
      return;
    }
    const location = locations.find((item) => item.id === selectedId);
    if (!location) return;
    const duration = prefersReducedMotion() ? 0 : 700;
    map.flyTo({
      center: [location.lng, location.lat],
      zoom: Math.max(map.getZoom(), 7.2),
      duration,
    });
  }, [selectedId, locations]);

  return (
    <div className="surface-card overflow-hidden h-[42vh] min-h-[280px] lg:sticky lg:top-6 lg:h-[calc(100svh-3rem)] lg:min-h-[560px] order-1 lg:order-2">
      <div ref={containerRef} className="h-full w-full" role="presentation" />
    </div>
  );
}

function getFeatureBBox(
  geometry: Geometry,
): [[number, number], [number, number]] | null {
  const coords: [number, number][] = [];
  collectCoords(geometry, coords);
  if (coords.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function collectCoords(geometry: Geometry, out: [number, number][]) {
  if (geometry.type === "Polygon") {
    geometry.coordinates.flat().forEach((pair) => out.push([pair[0], pair[1]]));
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.flat(2).forEach((pair) => out.push([pair[0], pair[1]]));
  }
}
