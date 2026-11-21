import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' so the built site works from any path (e.g. GitHub Pages) with HashRouter.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // recharts makes the single bundle ~950 kB; acceptable for a demo prototype.
  build: { chunkSizeWarningLimit: 1200 },
})
