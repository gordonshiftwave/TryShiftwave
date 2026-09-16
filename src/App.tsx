import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { DemoBanner } from "./components/DemoBanner";
import { Hero } from "./components/Hero";
import { ResultsList } from "./components/ResultsList";
import { SearchPanel } from "./components/SearchPanel";
import { SiteFooter } from "./components/SiteFooter";
import { geocodeQuery, geolocate } from "./lib/geocode";
import { loadLocations } from "./lib/locations";
import { rankLocations } from "./lib/rank";
import type { DemoLocation, SearchStatus } from "./types";
import { NEARBY_MILES } from "./types";

const LocationMap = lazy(() =>
  import("./components/LocationMap").then((mod) => ({ default: mod.LocationMap })),
);

export default function App() {
  const [locations, setLocations] = useState<DemoLocation[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchStatus>({ kind: "idle" });
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLocations()
      .then((payload) => {
        if (cancelled) return;
        setLocations(payload.locations);
        setIsLive(payload.isLive);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Could not load locations.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const origin = status.kind === "ready" ? status.origin : null;

  const ranked = useMemo(() => {
    if (!origin) {
      return locations
        .slice()
        .sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city))
        .map((location) => ({ ...location, distanceMiles: 0 }));
    }
    return rankLocations(locations, origin);
  }, [locations, origin]);

  const nearbyCount = origin
    ? ranked.filter((location) => location.distanceMiles <= NEARBY_MILES).length
    : 0;

  async function handleSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSearching(true);
    setStatus({ kind: "loading" });
    try {
      const found = await geocodeQuery(trimmed);
      if (!found) {
        setStatus({ kind: "empty-place", query: trimmed });
        setSelectedId(null);
        return;
      }
      const next = rankLocations(locations, found);
      setStatus({ kind: "ready", origin: found });
      setSelectedId(next[0]?.id ?? null);
    } catch {
      setStatus({
        kind: "error",
        message: "The lookup service is unavailable. Try again in a moment.",
      });
    } finally {
      setSearching(false);
    }
  }

  async function handleUseLocation() {
    setLocating(true);
    try {
      const found = await geolocate();
      const next = rankLocations(locations, found);
      setQuery("");
      setStatus({ kind: "ready", origin: found });
      setSelectedId(next[0]?.id ?? null);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "denied") setStatus({ kind: "geo-denied" });
      else setStatus({ kind: "geo-unavailable" });
    } finally {
      setLocating(false);
    }
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    document.getElementById(`place-${id}`)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
    });
  }

  return (
    <div className="min-h-svh">
      <a
        href="#results"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-20 focus:bg-cream focus:px-3 focus:py-2 focus:rounded-lg"
      >
        Skip to results
      </a>
      <Hero />
      <DemoBanner isLive={isLive} />
      {loadError && (
        <p className="max-w-[1180px] mx-auto px-5 sm:px-8 text-fall mb-4">
          {loadError}
        </p>
      )}
      <SearchPanel
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        onUseLocation={handleUseLocation}
        searching={searching}
        locating={locating}
      />
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 pb-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:items-start">
        <div id="results" className="order-2 lg:order-1">
          <ResultsList
            status={status}
            results={ranked}
            selectedId={selectedId}
            onSelect={handleSelect}
            nearbyCount={nearbyCount}
          />
        </div>
        <Suspense
          fallback={
            <div className="surface-card h-[42vh] min-h-[280px] lg:sticky lg:top-6 lg:h-[calc(100svh-3rem)] lg:min-h-[560px] order-1 lg:order-2 bg-sand/40" />
          }
        >
          <LocationMap
            locations={locations}
            origin={origin}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </Suspense>
      </div>
      <SiteFooter />
    </div>
  );
}
