import { WaveMark } from './WaveMark'

type EmptyStateProps = {
  title: string
  body: string
}

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="paper-card px-6 py-10 text-center">
      <WaveMark className="mx-auto mb-4 h-8 w-16 text-mist" />
      <h3 className="font-display text-2xl font-medium text-ink">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">{body}</p>
    </div>
  )
}
