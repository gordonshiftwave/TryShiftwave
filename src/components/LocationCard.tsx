import type { RankedLocation } from "../types";
import { formatAddress, formatMiles, mapsUrl } from "../lib/geo";

const TYPE_LABEL: Record<RankedLocation["type"], string> = {
  clinic: "Clinic",
  gym: "Gym",
  wellness: "Wellness",
  studio: "Studio",
};

type LocationCardProps = {
  location: RankedLocation;
  selected: boolean;
  showDistance: boolean;
  onSelect: (id: string) => void;
};

export function LocationCard({
  location,
  selected,
  showDistance,
  onSelect,
}: LocationCardProps) {
  const address = formatAddress(location);
  const maps = mapsUrl(location);

  return (
    <article
      id={`place-${location.id}`}
      className={`surface-card px-5 py-4 transition-[box-shadow,background-color] ${
        selected ? "bg-sand ring-1 ring-sky" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(location.id)}
        className="w-full text-left bg-transparent border-0 p-0 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="kicker m-0 text-rise">{TYPE_LABEL[location.type]}</p>
            <h3 className="font-display text-[1.35rem] leading-tight mt-1 mb-0">
              {location.name}
            </h3>
          </div>
          {showDistance && (
            <span className="shrink-0 rounded-full bg-mist/70 text-rise px-3 py-1 text-sm font-semibold">
              {formatMiles(location.distanceMiles)}
            </span>
          )}
        </div>
      </button>
      <address className="not-italic mt-3 text-ink-soft text-[0.98rem]">
        <a
          href={maps}
          target="_blank"
          rel="noreferrer"
          className="text-focus underline decoration-sky underline-offset-4 hover:text-ink"
        >
          {address}
        </a>
      </address>
      <p className="mt-2 mb-0 text-ink-soft">{location.hours}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {location.phone && (
          <a
            href={`tel:${location.phone.replace(/[^\d+]/g, "")}`}
            className="text-ink font-medium hover:text-focus"
          >
            {location.phone}
          </a>
        )}
        {location.email && (
          <a
            href={`mailto:${location.email}`}
            className="text-ink font-medium hover:text-focus"
          >
            {location.email}
          </a>
        )}
      </div>
    </article>
  );
}
