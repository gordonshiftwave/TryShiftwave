/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOCATIONS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
