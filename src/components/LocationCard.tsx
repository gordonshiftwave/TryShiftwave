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
      className="paper-card focus-ring cursor-pointer p-5 transition-transform duration-200 ease-out motion-reduce:transition-none"
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kicker mb-1.5 flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${PIN_COLOR[place.category]}`} />
            {CATEGORY_LABEL[place.category]}
            {place.region ? ` · ${place.region}` : ''}
          </p>
          <h3 className="font-display text-[1.35rem] leading-tight font-medium tracking-tight text-ink">
            {place.name}
          </h3>
        </div>
        {place.distanceMiles != null && (
          <span className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-sm font-medium text-rise-deep">
            {formatMiles(place.distanceMiles)}
          </span>
        )}
      </div>

      <dl className="mt-4 space-y-2 text-[0.98rem] text-ink-soft">
        {address && (
          <div className="flex gap-2">
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
