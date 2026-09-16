type WaveMarkProps = {
  className?: string
}

export function WaveMark({ className }: WaveMarkProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle
        cx="16"
        cy="16"
        r="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.32"
      />
      <circle
        cx="16"
        cy="16"
        r="8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.58"
      />
      <circle cx="16" cy="16" r="3.1" fill="currentColor" />
    </svg>
  )
}
