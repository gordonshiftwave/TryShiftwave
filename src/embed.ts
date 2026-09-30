/**
 * Embed / iframe mode for shiftwave.co (Shopify section, dedicated Find page).
 *
 * Enabled when any of these is true:
 * - `?embed=1` (also `true` / `yes` / bare `?embed`)
 * - path ends with `/embed` or `/embed.html`
 * - `VITE_EMBED=true` at build time
 * - the app is running inside an iframe
 */

export function readEmbedMode(): boolean {
  const baked = import.meta.env.VITE_EMBED?.trim().toLowerCase()
  if (baked === '1' || baked === 'true' || baked === 'yes') return true

  if (typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  if (params.has('embed')) {
    const value = params.get('embed')?.trim().toLowerCase() ?? ''
    if (value === '' || value === '1' || value === 'true' || value === 'yes') return true
  }

  const path = window.location.pathname.replace(/\/+$/, '')
  if (path.endsWith('/embed') || path.endsWith('/embed.html')) return true

  try {
    return window.self !== window.top
  } catch {
    // Cross-origin iframe: accessing window.top throws.
    return true
  }
}

export function applyEmbedDocumentState(embed = readEmbedMode()): boolean {
  if (typeof document === 'undefined') return embed
  document.documentElement.dataset.embed = embed ? 'true' : 'false'
  document.documentElement.classList.toggle('embed', embed)
  return embed
}

/**
 * Parent pages should keep the iframe inside this range so forms below the
 * finder stay on the page. Do not size the frame to 100vh.
 */
export const EMBED_FRAME_HEIGHT = { min: 640, preferred: 720, max: 880 } as const

/** Lets a parent page (Shopify section) size the iframe to this document. */
export function startEmbedResizeReporter(): () => void {
  if (typeof window === 'undefined' || window.parent === window) {
    return () => {}
  }

  const send = () => {
    const height = Math.ceil(
      Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0),
    )
    window.parent.postMessage(
      {
        source: 'try-shiftwave',
        type: 'resize',
        height,
        clamp: EMBED_FRAME_HEIGHT,
      },
      '*',
    )
  }

  send()
  const observer = new ResizeObserver(send)
  observer.observe(document.documentElement)
  if (document.body) observer.observe(document.body)
  window.addEventListener('resize', send)

  return () => {
    observer.disconnect()
    window.removeEventListener('resize', send)
  }
}
