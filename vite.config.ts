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
    server: {
      // Some editors/tools write a file in two steps (truncate, then write). The watcher fires on the
      // first, Vite caches the empty module, and the second change is dropped (<50 ms apart): blank
      // page ("doesn't provide an export named …") until the file changes again. Wait for the write.
      watch: { awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 20 } },
    },
    plugins: [
      react(),
      // Offline strategy and update flow: docs/adr/0004 (local). Workout data lives in IndexedDB, never in this cache.
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeManifestIcons: false, // already matched by globPatterns
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
          // "GT" logo assets (black and orange on white). The maskable one has a wider safe margin.
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'], // the plugin adds the manifest itself
          // Logo variants kept for design use; the app does not load them, so phones don't download them.
          globIgnores: ['logo.svg', 'logo-dark.svg', 'logo.png', 'pwa-dark-512x512.png'],
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
