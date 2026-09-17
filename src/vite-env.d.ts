/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOCATIONS_URL?: string
  /** Bake embed/full-bleed layout (also enabled by `?embed=1` or an iframe). */
  readonly VITE_EMBED?: string
  /** Asset base path (`/`, `/pages/find-shiftwave/`, `/TryShiftwave/`). */
  readonly VITE_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*?worker&url' {
  const src: string
  export default src
}
