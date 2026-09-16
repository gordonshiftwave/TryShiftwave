import type { RadiusMiles } from '../types/location'

const RADII: { value: RadiusMiles; label: string }[] = [
  { value: 25, label: '25 mi' },
  { value: 50, label: '50 mi' },
  { value: 100, label: '100 mi' },
  { value: 250, label: '250 mi' },
  { value: 'any', label: 'Any distance' },
]

type SearchPanelProps = {
  query: string
  radius: RadiusMiles
  searching: boolean
  locating: boolean
  error: string | null
  onQueryChange: (value: string) => void
  onRadiusChange: (value: RadiusMiles) => void
  onSearch: () => void
  onUseLocation: () => void
}

export function SearchPanel({
  query,
  radius,
  searching,
  locating,
  error,
  onQueryChange,
  onRadiusChange,
  onSearch,
  onUseLocation,
}: SearchPanelProps) {
  return (
    <form
      className="surface-card p-3 sm:p-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch()
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium tracking-wide text-ink-faint uppercase">
              ZIP, city, or address
            </span>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="94123, Boulder, or 10014"
              autoComplete="postal-code"
              enterKeyHint="search"
              className="surface-field h-11 w-full rounded-[16px] px-4 text-base text-ink placeholder:text-ink-faint/70"
            />
          </label>
          <label className="flex w-full flex-col gap-1 lg:w-[8.5rem]">
            <span className="text-xs font-medium tracking-wide text-ink-faint uppercase">
              Within
            </span>
            <select
              value={String(radius)}
              onChange={(event) => {
                const next = event.target.value
                onRadiusChange(next === 'any' ? 'any' : (Number(next) as RadiusMiles))
              }}
              className="surface-field h-11 w-full rounded-[16px] px-3 text-base text-ink"
            >
              {RADII.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={searching}
            className="inline-flex h-11 items-center justify-center rounded-[16px] bg-rise px-5 text-sm font-semibold tracking-wide text-cream transition-colors hover:bg-focus disabled:opacity-60 lg:px-6"
          >
            {searching ? 'Searching…' : 'Find try-spots'}
          </button>
          <button
            type="button"
            onClick={onUseLocation}
            disabled={locating}
            className="inline-flex h-11 items-center justify-center rounded-[16px] border border-line bg-cream px-5 text-sm font-semibold text-ink transition-colors hover:bg-sand disabled:opacity-60"
          >
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>
        {error ? (
          <p className="text-sm text-fall" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-sm text-ink-faint">
            Qualified public locations only — clinics, gyms, and studios that host demos.
          </p>
        )}
      </div>
    </form>
  )
}
