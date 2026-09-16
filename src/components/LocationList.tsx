import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/format'
import type { LocatedPlace } from '../types/location'
import { EmptyState } from './EmptyState'
import { LocationCard } from './LocationCard'

type LocationListProps = {
  places: LocatedPlace[]
  selectedId: string | null
  heading: string
  subheading: string
  emptyTitle: string
  emptyBody: string
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onWiden?: () => void
  onNearest?: () => void
  showEmptyActions: boolean
}

export function LocationList({
  places,
  selectedId,
  heading,
  subheading,
  emptyTitle,
  emptyBody,
  onSelect,
  onHover,
  onWiden,
  onNearest,
  showEmptyActions,
}: LocationListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedId) return
    const node = document.getElementById(`place-${selectedId}`)
    if (node instanceof HTMLElement) {
      node.scrollIntoView({
        block: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    }
  }, [selectedId])

  if (places.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody}
        onWiden={showEmptyActions ? onWiden : undefined}
        onNearest={showEmptyActions ? onNearest : undefined}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4">
        <h2 className="font-display text-2xl font-medium text-ink">{heading}</h2>
        <p className="mt-1 text-sm text-ink-soft">{subheading}</p>
      </div>
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
      >
        {places.map((place) => (
          <LocationCard
            key={place.id}
            place={place}
            selected={place.id === selectedId}
            onSelect={() => onSelect(place.id)}
            onHover={onHover}
          />
        ))}
      </div>
    </div>
  )
}
