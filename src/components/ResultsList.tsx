import type { RankedLocation, SearchStatus } from "../types";
import { NEARBY_MILES } from "../types";
import { LocationCard } from "./LocationCard";

type ResultsListProps = {
  status: SearchStatus;
  results: RankedLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  nearbyCount: number;
};

export function ResultsList({
  status,
  results,
  selectedId,
  onSelect,
  nearbyCount,
}: ResultsListProps) {
  return (
    <section aria-live="polite" className="min-w-0">
      <ResultsHeader
        status={status}
        nearbyCount={nearbyCount}
        total={results.length}
      />
      {status.kind === "empty-place" && (
        <EmptyCard
          title="We couldn’t find that place"
          body="Try a 5-digit ZIP, a city with a state (like “Boulder, CO”), or a street address."
        />
      )}
      {status.kind === "geo-denied" && (
        <EmptyCard
          title="Location access was declined"
          body="That’s okay — type a ZIP or city instead and we’ll sort the nearest demo spots."
        />
      )}
      {status.kind === "geo-unavailable" && (
        <EmptyCard
          title="We couldn’t read your location"
          body="Search a ZIP or city and we’ll take it from there."
        />
      )}
      {status.kind === "error" && (
        <EmptyCard title="Something went sideways" body={status.message} />
      )}
      {status.kind === "idle" && (
        <p className="text-ink-soft mt-3 mb-0">
          Search a ZIP to sort by distance, or browse below. Click a state on
          the map to zoom, then tap a pin.
        </p>
      )}
      {status.kind === "ready" && nearbyCount === 0 && (
        <EmptyCard
          title={`No demo spots within ${NEARBY_MILES} miles`}
          body={`Nothing qualified is close to ${status.origin.label} yet. Here are the nearest places nationwide — still example data.`}
        />
      )}

      {results.length > 0 && status.kind !== "loading" && (
        <ul className="mt-4 space-y-3 p-0 m-0 list-none">
          {results.map((location) => (
            <li key={location.id}>
              <LocationCard
                location={location}
                selected={location.id === selectedId}
                showDistance={status.kind === "ready"}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ResultsHeader({
  status,
  nearbyCount,
  total,
}: {
  status: SearchStatus;
  nearbyCount: number;
  total: number;
}) {
  if (status.kind === "loading") {
    return <p className="kicker">Looking up that place…</p>;
  }
  if (status.kind === "ready") {
    return (
      <div>
        <p className="kicker">Nearest demo spots</p>
        <h2 className="font-display text-2xl mt-1 mb-0 text-ink">
          {nearbyCount > 0
            ? `${nearbyCount} within ${NEARBY_MILES} miles of ${status.origin.label}`
            : `Closest to ${status.origin.label}`}
        </h2>
      </div>
    );
  }
  if (status.kind === "idle") {
    return (
      <div>
        <p className="kicker">Browse the map</p>
        <h2 className="font-display text-2xl mt-1 mb-0 text-ink">
          {total} example studios across the U.S.
        </h2>
      </div>
    );
  }
  return <p className="kicker">Demo locations</p>;
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface-card mt-4 px-5 py-6">
      <h3 className="font-display text-xl m-0">{title}</h3>
      <p className="text-ink-soft mt-2 mb-0">{body}</p>
    </div>
  );
}
