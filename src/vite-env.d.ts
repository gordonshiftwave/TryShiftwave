/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOCATIONS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*?worker&url' {
  const src: string
  export default src
}
