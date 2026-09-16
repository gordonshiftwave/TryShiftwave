type DemoBannerProps = {
  source: 'demo' | 'sheet'
}

export function DemoBanner({ source }: DemoBannerProps) {
  if (source === 'sheet') {
    return (
      <div className="surface-card px-4 py-3 sm:px-5">
        <p className="text-sm text-ink-soft">
          Showing the live qualified sheet. Only public, demo-friendly locations appear
          on this map.
        </p>
      </div>
    )
  }

  return (
    <div className="surface-card flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex rounded-full bg-sand px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-rise uppercase">
          Demo data
        </span>
        <p className="text-sm text-ink-soft">
          Example US clusters while the live qualified Google Sheet is wired up. Names
          and contacts here are not real try-spots.
        </p>
      </div>
    </div>
  )
}
