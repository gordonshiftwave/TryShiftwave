type StateCount = {
  abbr: string
  name: string
  count: number
}

type StateChipsProps = {
  states: StateCount[]
  active: string | null
  onSelect: (abbr: string | null) => void
}

export function StateChips({ states, active, onSelect }: StateChipsProps) {
  if (states.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
        Or browse a state
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {states.map((state) => {
          const selected = active === state.abbr
          return (
            <button
              key={state.abbr}
              type="button"
              onClick={() => onSelect(selected ? null : state.abbr)}
              aria-pressed={selected}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                selected
                  ? 'border-rise bg-rise text-cream'
                  : 'border-line bg-cream text-ink-soft hover:bg-sand'
              }`}
            >
              {state.name}
              <span className={selected ? 'ml-1.5 text-cream/80' : 'ml-1.5 text-ink-faint'}>
                {state.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
