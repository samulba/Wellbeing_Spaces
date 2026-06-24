import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// Leichtgewichtige Unit-Tests für reine Logik (kein DOM/Next nötig).
// Der @/*-Alias aus tsconfig.json wird via vite-tsconfig-paths aufgelöst.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
