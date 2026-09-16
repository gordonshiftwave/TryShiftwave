import { CATEGORY_LABEL, type RankedLocation } from '../types'
import { formatAddress, mapsUrl } from '../data/parse'
import { formatMiles } from '../geo/distance'

const PIN_COLOR: Record<RankedLocation['category'], string> = {
  clinic: 'bg-sky',
  gym: 'bg-coral',
  wellness: 'bg-sage',
  studio: 'bg-lavender',
}

type LocationCardProps = {
  place: RankedLocation
  active: boolean
  onSelect: () => void
  onHover: (id: string | null) => void
}

export function LocationCard({ place, active, onSelect, onHover }: LocationCardProps) {
  const address = formatAddress(place)

  return (
    <article
      id={`place-${place.id}`}
      data-active={active}
      className="place-row focus-ring cursor-pointer px-3 py-4 sm:px-4"
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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-[1.2rem] leading-tight font-medium tracking-tight text-ink sm:text-[1.28rem]">
            {place.name}
          </h3>
          <p className="mt-1 flex items-center gap-2 text-[0.95rem] text-ink-faint">
            <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${PIN_COLOR[place.category]}`} />
            <span>
              {CATEGORY_LABEL[place.category]}
              {place.region ? ` · ${place.region}` : ''}
            </span>
          </p>
        </div>
        {place.distanceMiles != null && (
          <span className="shrink-0 pt-0.5 text-sm tabular-nums text-ink-soft">
            {formatMiles(place.distanceMiles)}
          </span>
        )}
      </div>

      <dl className="mt-2.5 space-y-1 text-[0.95rem] text-ink-soft">
        {address && (
          <div>
            <dt className="sr-only">Address</dt>
            <dd>
              <a
                className="focus-ring rounded-sm underline decoration-line underline-offset-4 hover:text-focus"
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
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {place.phone && (
              <dd>
                <a
                  className="focus-ring rounded-sm hover:text-focus"
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
                  className="focus-ring rounded-sm hover:text-focus"
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
