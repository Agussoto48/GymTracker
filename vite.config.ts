/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the app from /GymTracker/; dev server stays at the root.
  base: command === 'build' || isPreview ? '/GymTracker/' : '/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
}))
