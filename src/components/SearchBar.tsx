import type { FormEvent } from 'react'

type SearchBarProps = {
  variant: 'hero' | 'compact'
  query: string
  onQueryChange: (value: string) => void
  onSearch: (query: string) => void
  onUseLocation: () => void
  searching: boolean
  locating: boolean
  disabled?: boolean
}

export function SearchBar({
  variant,
  query,
  onQueryChange,
  onSearch,
  onUseLocation,
  searching,
  locating,
  disabled = false,
}: SearchBarProps) {
  const isHero = variant === 'hero'
  const inputId = 'place-search'

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSearch(query)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        isHero
          ? 'mx-auto w-full max-w-[42rem]'
          : 'flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:gap-3'
      }
      role="search"
    >
      <label htmlFor={inputId} className="sr-only">
        ZIP, city, or address
      </label>

      <div
        className={
          isHero
            ? 'search-shell search-shell--hero'
            : 'search-shell search-shell--compact min-w-0 sm:flex-1'
        }
      >
        <span className="search-shell__icon" aria-hidden="true">
          <SearchIcon size={isHero ? 22 : 18} />
        </span>
        <input
          id={inputId}
          name="q"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={isHero ? 'ZIP, city, or address' : 'Search ZIP, city, or address'}
          autoComplete="off"
          enterKeyHint="search"
          disabled={disabled}
          className={
            isHero
              ? 'search-shell__input min-h-[3.75rem] text-[1.05rem] sm:min-h-[4.25rem] sm:text-[1.28rem]'
              : 'search-shell__input min-h-11 text-base'
          }
        />
        <button
          type="submit"
          className={
            isHero
              ? 'search-submit focus-ring m-1.5 min-h-12 shrink-0 rounded-full px-5 text-base font-medium sm:min-h-[3.25rem] sm:px-7'
              : 'search-submit focus-ring m-1 min-h-9 shrink-0 rounded-full px-4 text-sm font-medium'
          }
          disabled={disabled || searching}
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>

      <div className={isHero ? 'mt-5 flex justify-center' : 'flex justify-start sm:justify-center'}>
        <button
          type="button"
          className={
            isHero
              ? 'focus-ring inline-flex items-center gap-2 rounded-full px-3 py-2 text-[0.95rem] font-medium text-ink-faint hover:bg-cream/70 hover:text-energy'
              : 'focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-ink-faint hover:text-energy'
          }
          onClick={() => void onUseLocation()}
          disabled={disabled || locating}
        >
          <LocateIcon />
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      </div>
    </form>
  )
}

function SearchIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12.4 12.4 16.2 16.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function LocateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 1.75v1.5M9 14.75v1.5M1.75 9h1.5M14.75 9h1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="1.15" fill="currentColor" />
    </svg>
  )
}
