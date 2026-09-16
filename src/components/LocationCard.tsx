import { categoryLabel, type RankedLocation } from '../types'
import { formatAddress, mapsUrl } from '../data/parse'
import { formatMiles } from '../geo/distance'

type LocationCardProps = {
  place: RankedLocation
  active: boolean
  nearest?: boolean
  onSelect: () => void
  onHover: (id: string | null) => void
}

export function LocationCard({ place, active, nearest = false, onSelect, onHover }: LocationCardProps) {
  const address = formatAddress(place)

  return (
    <article
      id={`place-${place.id}`}
      data-active={active}
      className="place-row focus-ring cursor-pointer px-3.5 py-3.5 sm:px-5 sm:py-4"
      tabIndex={0}
      role="button"
      aria-pressed={active}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      onMouseEnter={() => onHover(place.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(place.id)}
      onBlur={() => onHover(null)}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[1.05rem] font-semibold leading-[1.3] tracking-normal text-ink sm:text-[1.18rem]">
              {place.name}
            </h3>
            {nearest && <span className="nearest-mark">Nearest</span>}
          </div>
          <p className="mt-0.5 truncate text-[0.78rem] leading-snug text-ink-faint sm:text-[0.82rem]">
            {categoryLabel(place.category)}
            {place.region ? ` · ${place.region}` : ''}
          </p>
        </div>
        {place.distanceMiles != null && (
          <span className="distance-chip mt-0.5">{formatMiles(place.distanceMiles)}</span>
        )}
      </div>

      <dl className="mt-1.5 space-y-0.5 text-[0.88rem] leading-relaxed text-ink-soft sm:text-[0.92rem]">
        {address && (
          <div>
            <dt className="sr-only">Address</dt>
            <dd>
              <a
                className="focus-ring rounded-sm underline decoration-line underline-offset-4 hover:text-energy"
                href={mapsUrl(place)}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                {address}
              </a>
            </dd>
          </div>
        )}
        {place.hours && (
          <div>
            <dt className="sr-only">Hours</dt>
            <dd>{place.hours}</dd>
          </div>
        )}
        {(place.phone || place.email) && (
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {place.phone && (
              <dd>
                <a
                  className="focus-ring rounded-sm hover:text-energy"
                  href={`tel:${place.phone.replace(/[^\d+]/g, '')}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  {place.phone}
                </a>
              </dd>
            )}
            {place.email && (
              <dd>
                <a
                  className="focus-ring rounded-sm hover:text-energy"
                  href={`mailto:${place.email}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  {place.email}
                </a>
              </dd>
            )}
          </div>
        )}
      </dl>
    </article>
  )
}
