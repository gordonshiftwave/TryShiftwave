import { visitorCopy } from '../copy/visitor'
import { addressLines, hasListedHours, telHref } from '../data/parse'
import { formatMiles } from '../geo/distance'
import { directionsHref } from '../geo/directions'
import type { Coord, RankedLocation } from '../types'

type PlaceFactsProps = {
  place: RankedLocation
  origin: Coord | null
  /** Selected row or map popup: show the street note when we only have a city. */
  detailed?: boolean
  showName?: boolean
  onChoose?: (id: string) => void
}

export function PlaceFacts({
  place,
  origin,
  detailed = false,
  showName = false,
  onChoose,
}: PlaceFactsProps) {
  const lines = addressLines(place)
  const directions = directionsHref(place, { origin })
  const phoneHref = place.phone ? telHref(place.phone) : ''

  return (
    <div className={detailed ? 'place-facts place-facts--detailed' : 'place-facts'}>
      {showName && (
        <div className="flex items-start justify-between gap-3">
          {onChoose ? (
            <button type="button" className="place-facts__name focus-ring" onClick={() => onChoose(place.id)}>
              {place.name}
            </button>
          ) : (
            <p className="place-facts__name">{place.name}</p>
          )}
          {place.distanceMiles != null && (
            <span className="distance-chip">{formatMiles(place.distanceMiles)}</span>
          )}
        </div>
      )}

      <div>
        {detailed && <p className="place-facts__kicker">{visitorCopy.addressLabel}</p>}
        {lines.street ? <p className="place-facts__street">{lines.street}</p> : null}
        {lines.locality ? (
          <p className="place-facts__locality">{lines.locality}</p>
        ) : (
          <p className="place-facts__locality">Address not listed yet.</p>
        )}
        {detailed && !lines.street && <p className="place-facts__note">{visitorCopy.streetMissing}</p>}
      </div>

      <a
        className="directions-link focus-ring"
        href={directions}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${visitorCopy.directions} to ${place.name}`}
      >
        <DirectionsIcon />
        {visitorCopy.directions}
      </a>

      {(phoneHref || place.email || hasListedHours(place.hours)) && (
        <div className="place-facts__meta">
          {phoneHref && (
            <a className="place-facts__phone focus-ring" href={phoneHref}>
              {place.phone}
            </a>
          )}
          {hasListedHours(place.hours) && <p>{place.hours}</p>}
          {place.email && (
            <a className="place-facts__email focus-ring" href={`mailto:${place.email}`}>
              {place.email}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function DirectionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.2 8.2 8.1 2.3a.7.7 0 0 1 1 0l4.6 4.6a.7.7 0 0 1 0 1L8.1 13.7a.7.7 0 0 1-1 0L2.2 9.2a.7.7 0 0 1 0-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 5.2v3.1h2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
