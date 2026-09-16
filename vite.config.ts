import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** GitHub Pages project site: https://gordonshiftwave.github.io/TryShiftwave/ */
const PAGES_BASE = '/TryShiftwave/'

export default defineConfig(({ command, isPreview }) => ({
  // `npm run dev` stays at http://localhost:5173/. Build + preview use the Pages path.
  base: command === 'serve' && !isPreview ? '/' : PAGES_BASE,
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
}))
