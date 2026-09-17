/**
 * Resolve a file from `public/` against Vite `base` (`import.meta.env.BASE_URL`).
 * Default production build uses `/TryShiftwave/` for GitHub Pages; override with
 * `VITE_BASE` (`/` or `/pages/find-shiftwave/`) when hosting on shiftwave.co.
 */
export function publicFile(path: string): string {
  const filename = path.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${filename}`
}
