/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => {
  // GitHub Pages serves the app from /GymTracker/; dev server stays at the root.
  const base = command === 'build' || isPreview ? '/GymTracker/' : '/'
  return {
    base,
    define: {
      // Shown in the app so the user can tell which version is running (and that an update applied).
      __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    plugins: [
      react(),
      // Offline strategy and update flow: docs/adr/0004 (local). Workout data lives in IndexedDB, never in this cache.
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: base,
          name: 'GymTracker',
          short_name: 'GymTracker',
          description: 'Registro de entrenamientos de gimnasio, sin conexión.',
          lang: 'es',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#f2f2f5',
          theme_color: '#f2f2f5',
          // PNGs rendered from public/favicon.svg:
          // rsvg-convert -w 512 -h 512 public/favicon.svg -o public/pwa-512x512.png (also 192 and 180 apple-touch-icon)
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  }
})
