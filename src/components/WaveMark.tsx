type WaveMarkProps = {
  className?: string;
  animated?: boolean;
};

export function WaveMark({ className = "h-7 w-16", animated = false }: WaveMarkProps) {
  return (
    <svg
      viewBox="0 0 72 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M2 15 C12 15 12 6 22 6 S32 15 42 15 52 5 62 11 68 17 70 13"
        className={animated ? "wave-draw" : undefined}
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
