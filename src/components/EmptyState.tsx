import { WaveMark } from './WaveMark'

type EmptyStateProps = {
  title: string
  body: string
}

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="paper-card px-6 py-9 text-center sm:py-10">
      <WaveMark className="mx-auto mb-4 h-8 w-16 text-peach-warm" />
      <h3 className="font-display text-[1.45rem] font-semibold leading-[1.3] tracking-normal text-ink sm:text-2xl">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-ink-soft">{body}</p>
    </div>
  )
}
