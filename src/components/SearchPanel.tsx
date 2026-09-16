import { useId, type FormEvent } from "react";

const REGIONS = [
  { label: "Bay Area", query: "San Francisco, CA" },
  { label: "Los Angeles", query: "Los Angeles, CA" },
  { label: "Florida", query: "Tampa, FL" },
  { label: "Las Vegas", query: "Las Vegas, NV" },
  { label: "Central NJ", query: "Princeton, NJ" },
  { label: "Chicago", query: "Chicago, IL" },
  { label: "Nashville", query: "Nashville, TN" },
  { label: "Boulder", query: "Boulder, CO" },
];

type SearchPanelProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (query: string) => void;
  onUseLocation: () => void;
  searching: boolean;
  locating: boolean;
};

export function SearchPanel({
  query,
  onQueryChange,
  onSearch,
  onUseLocation,
  searching,
  locating,
}: SearchPanelProps) {
  const inputId = useId();
  const busy = searching || locating;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSearch(query);
  }

  return (
    <section className="max-w-[1180px] mx-auto px-5 sm:px-8 mb-8">
      <form
        onSubmit={handleSubmit}
        className="surface-card p-3 sm:p-4 flex flex-col sm:flex-row gap-3"
      >
        <label htmlFor={inputId} className="sr-only">
          ZIP, city, or address
        </label>
        <div className="flex-1 relative">
          <input
            id={inputId}
            type="search"
            enterKeyHint="search"
            autoComplete="postal-code"
            placeholder="ZIP, city, or address"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="w-full h-12 sm:h-14 rounded-[18px] bg-paper border border-line px-4 text-base text-ink placeholder:text-ink-faint/80 outline-none focus-visible:ring-2 focus-visible:ring-focus/40 focus-visible:border-focus"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy || query.trim().length === 0}
            className="flex-1 sm:flex-none h-12 sm:h-14 px-5 rounded-[18px] bg-rise text-cream font-semibold disabled:opacity-50 hover:brightness-[1.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {searching ? "Searching…" : "Find spots"}
          </button>
          <button
            type="button"
            onClick={onUseLocation}
            disabled={busy}
            className="flex-1 sm:flex-none h-12 sm:h-14 px-4 rounded-[18px] border border-line bg-cream text-ink font-semibold hover:bg-sand disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {locating ? "Locating…" : "Use my location"}
          </button>
        </div>
      </form>
      <div className="flex flex-wrap gap-2 mt-3 px-1">
        {REGIONS.map((region) => (
          <button
            key={region.query}
            type="button"
            onClick={() => {
              onQueryChange(region.query);
              onSearch(region.query);
            }}
            className="kicker rounded-full border border-line bg-cream px-3 py-1.5 text-ink-soft hover:border-sky hover:text-ink"
          >
            {region.label}
          </button>
        ))}
      </div>
    </section>
  );
}
