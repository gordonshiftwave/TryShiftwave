import type { MouseEvent } from 'react'
import { formatMiles } from '../lib/distance'
import { fullAddress, mapsUrl, telHref } from '../lib/format'
import type { LocatedPlace } from '../types/location'

type LocationCardProps = {
  place: LocatedPlace
  selected: boolean
  onSelect: () => void
  onHover: (id: string | null) => void
}

export function LocationCard({ place, selected, onSelect, onHover }: LocationCardProps) {
  const phoneLink = place.phone ? telHref(place.phone) : null
  const distance = formatMiles(place.distanceMiles)

  const stop = (event: MouseEvent) => {
    event.stopPropagation()
  }

  return (
    <article
      id={`place-${place.id}`}
      onClick={onSelect}
      onMouseEnter={() => onHover(place.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(place.id)}
      onBlur={() => onHover(null)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      tabIndex={0}
      className={`surface-card cursor-pointer p-5 transition-colors ${
        selected ? 'border-rise ring-1 ring-rise' : 'hover:bg-sand/60'
      }`}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl leading-tight font-medium text-ink">
            {place.name}
          </h3>
          {place.category ? (
            <p className="mt-1 text-sm text-ink-faint">{place.category}</p>
          ) : null}
        </div>
        {distance ? (
          <span className="shrink-0 rounded-full bg-mist/70 px-2.5 py-1 text-sm font-medium text-rise">
            {distance}
          </span>
        ) : null}
      </div>

      <a
        href={mapsUrl(place)}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        className="mt-3 block text-sm leading-relaxed text-focus underline decoration-sky/80 underline-offset-4 hover:text-rise"
      >
        {fullAddress(place)}
      </a>

      {place.hours ? (
        <p className="mt-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">Hours</span>
          <span className="mx-2 text-line">·</span>
          {place.hours}
        </p>
      ) : null}

      {(phoneLink || place.email) && (
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {phoneLink ? (
            <a
              href={phoneLink}
              onClick={stop}
              className="text-focus underline decoration-sky/80 underline-offset-4 hover:text-rise"
            >
              {place.phone}
            </a>
          ) : null}
          {place.email ? (
            <a
              href={`mailto:${place.email}`}
              onClick={stop}
              className="text-focus underline decoration-sky/80 underline-offset-4 hover:text-rise"
            >
              {place.email}
            </a>
          ) : null}
        </p>
      )}
    </article>
  )
}
