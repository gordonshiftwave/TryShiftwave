type DemoBannerProps = {
  isLive: boolean;
};

export function DemoBanner({ isLive }: DemoBannerProps) {
  if (isLive) return null;

  return (
    <div
      role="status"
      className="max-w-[1180px] mx-auto px-5 sm:px-8 mb-6"
    >
      <p className="surface-card px-4 py-3 sm:px-5 text-sm text-ink-soft flex gap-3 items-start">
        <span
          aria-hidden="true"
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral"
        />
        <span>
          <span className="kicker text-fall mr-2">Demo data</span>
          These pins are example locations for playtesting — not the live
          partner list. Qualified public demo spots will replace this file
          before launch.
        </span>
      </p>
    </div>
  );
}
