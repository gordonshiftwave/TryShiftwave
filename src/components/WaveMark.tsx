type WaveMarkProps = {
  className?: string
  title?: string
}

export function WaveMark({ className = 'h-7 w-14', title }: WaveMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 72 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d="M4 16c7.5-11 13-11 20 0s13 11 20 0 13-11 20 0"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
