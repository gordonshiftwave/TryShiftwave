type EmptyStateProps = {
  title: string
  body: string
  onWiden?: () => void
  onNearest?: () => void
  widenLabel?: string
}

export function EmptyState({
  title,
  body,
  onWiden,
  onNearest,
  widenLabel = 'Widen to 250 miles',
}: EmptyStateProps) {
  return (
    <div className="surface-card flex flex-col items-center px-6 py-12 text-center">
      <svg
        viewBox="0 0 120 120"
        className="h-24 w-24 text-rise"
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.22" />
        <circle cx="60" cy="60" r="32" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
        <circle cx="60" cy="60" r="16" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.65" />
        <circle cx="60" cy="60" r="5" fill="currentColor" />
      </svg>
      <h3 className="font-display mt-6 text-2xl font-medium text-ink">{title}</h3>
      <p className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">{body}</p>
      {(onWiden || onNearest) && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {onWiden ? (
            <button
              type="button"
              onClick={onWiden}
              className="rounded-[18px] bg-rise px-4 py-2.5 text-sm font-semibold text-cream hover:bg-focus"
            >
              {widenLabel}
            </button>
          ) : null}
          {onNearest ? (
            <button
              type="button"
              onClick={onNearest}
              className="rounded-[18px] border border-line bg-cream px-4 py-2.5 text-sm font-semibold text-ink hover:bg-sand"
            >
              Show nearest nationwide
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
