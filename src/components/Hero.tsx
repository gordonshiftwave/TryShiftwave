import { WaveMark } from "./WaveMark";

export function Hero() {
  return (
    <header className="max-w-[1180px] mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-6">
      <div className="flex items-center gap-3 text-rise">
        <WaveMark animated className="h-8 w-[4.5rem]" />
        <p className="kicker m-0">Try Shiftwave</p>
      </div>
      <h1 className="font-display font-medium text-[2.15rem] sm:text-5xl lg:text-[3.4rem] leading-[1.08] tracking-[-0.02em] text-ink mt-5 max-w-3xl">
        Where Can I Try Shiftwave?
      </h1>
      <p className="mt-4 max-w-xl text-ink-soft text-lg sm:text-[1.2rem] leading-relaxed">
        Full-body pulsed pressure and guided breathwork, nearby. Search a ZIP,
        city, or address — or use your location — to find a qualified demo
        studio.
      </p>
    </header>
  );
}
