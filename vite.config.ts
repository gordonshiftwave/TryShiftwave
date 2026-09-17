import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** GitHub Pages project site: https://gordonshiftwave.github.io/TryShiftwave/ */
const PAGES_BASE = '/TryShiftwave/'

function normalizeBase(value: string | undefined): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return ''
  if (trimmed === './') return './'
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

export default defineConfig(({ command, isPreview, mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const fromEnv = normalizeBase(env.VITE_BASE)

  // `npm run dev` stays at http://localhost:5173/. Production build defaults to
  // the Pages path so GitHub Pages keeps working. Override with VITE_BASE for
  // shiftwave.co (`/` or `/pages/find-shiftwave/`).
  const base =
    fromEnv || (command === 'serve' && !isPreview ? '/' : PAGES_BASE)

  return {
    base,
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      exclude: ['maplibre-gl'],
    },
    worker: {
      format: 'es',
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: true,
      port: 4173,
      strictPort: true,
    },
  }
})
