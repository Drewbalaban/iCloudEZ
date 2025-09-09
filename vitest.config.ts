import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  // Use automatic JSX runtime for tests (no need to import React in every file)
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  // Avoid loading project PostCSS/Tailwind config in tests
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
