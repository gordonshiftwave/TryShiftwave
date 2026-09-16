/**
 * Resolve a file from `public/` against Vite `base`.
 * GitHub Pages project sites are served from `/TryShiftwave/`, not `/`.
 */
export function publicFile(path: string): string {
  const filename = path.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${filename}`
}
