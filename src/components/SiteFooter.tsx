import { WaveMark } from "./WaveMark";

export function SiteFooter() {
  return (
    <footer className="max-w-[1180px] mx-auto px-5 sm:px-8 py-12 mt-4">
      <div className="border-t border-line pt-8 flex flex-col sm:flex-row sm:items-end gap-4 sm:justify-between">
        <div>
          <WaveMark className="h-6 w-14 text-slate" />
          <p className="kicker mt-3 mb-2">Qualified demos only</p>
          <p className="text-ink-soft max-w-md m-0">
            Shiftwave is a full-body pulsed pressure and guided breathwork
            system. This locator lists public, demo-friendly studios — not
            every place a unit lives.
          </p>
        </div>
        <p className="text-sm text-ink-faint m-0">
          <a
            href="https://shiftwave.co"
            className="underline decoration-line underline-offset-4 hover:text-ink"
          >
            shiftwave.co
          </a>
        </p>
      </div>
    </footer>
  );
}
