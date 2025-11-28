import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages - use repository name
  // For https://runeov.github.io/helseplattform/
  base: '/helseplattform/',
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    // Generate sourcemaps for debugging
    sourcemap: true,
  }
})