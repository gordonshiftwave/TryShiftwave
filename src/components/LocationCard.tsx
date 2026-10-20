import { PlaceFacts } from './PlaceFacts'
import { categoryLabel, pinKind, visitModelLabel, type LocationCategory, type RankedLocation } from '../types'
import { formatDistance, type DistanceUnit } from '../geo/distance'
import type { Coord } from '../types'

const PIN_COLOR: Record<LocationCategory, string> = {
  clinic: 'bg-energy',
  gym: 'bg-peach-warm',
  wellness: 'bg-calm',
  studio: 'bg-indigo',
}

type LocationCardProps = {
  place: RankedLocation
  origin: Coord | null
  active: boolean
  onSelect: () => void
  onHover: (id: string | null) => void
  unit: DistanceUnit
}

export function LocationCard({ place, origin, active, onSelect, onHover, unit }: LocationCardProps) {
  const visitLabel = visitModelLabel(place.visitModel)

  return (
    <article
      id={`place-${place.id}`}
      data-active={active}
      className="place-row"
      onMouseEnter={() => onHover(place.id)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        type="button"
        className="place-row__hit focus-ring"
        aria-pressed={active}
        aria-expanded={active}
        aria-label={`Show ${place.name} on the map`}
        onClick={onSelect}
        onFocus={() => onHover(place.id)}
        onBlur={() => onHover(null)}
      />
      <div className="place-row__body px-3.5 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-3 sm:gap-5">
          <div className="min-w-0">
            <h3 className="font-display text-[1.05rem] font-semibold leading-[1.3] tracking-normal text-ink sm:text-[1.18rem]">
              {place.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-2 text-[0.78rem] leading-snug text-ink-soft sm:text-[0.82rem]">
              <span
                className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${PIN_COLOR[pinKind(place.category)]}`}
              />
              <span className="truncate">
                {categoryLabel(place.category)}
                {place.region ? ` · ${place.region}` : ''}
              </span>
            </p>
            {visitLabel && <p className="visit-label visit-label--appointment mt-1">{visitLabel}</p>}
          </div>
          {place.distanceMiles != null && (
            <span className="distance-chip mt-0.5">{formatDistance(place.distanceMiles, unit)}</span>
          )}
        </div>
        <PlaceFacts place={place} origin={origin} detailed={active} unit={unit} />
      </div>
    </article>
  )
}
