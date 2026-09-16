import { publicFile } from '../publicFile'

type WaveMarkProps = {
  className?: string
  title?: string
}

/** Official Shiftwave square mark (header CDN logo) — dark field, light wave. */
export function WaveMark({ className = 'h-10 w-10', title }: WaveMarkProps) {
  return (
    <img
      src={publicFile('logo.png')}
      alt={title ?? ''}
      width={512}
      height={512}
      draggable={false}
      className={className}
      role={title ? undefined : 'presentation'}
    />
  )
}
