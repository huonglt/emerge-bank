import { defineConfig, mergeConfig } from 'vitest/config'

export default defineConfig(() =>
  mergeConfig(
    defineConfig({
      test: {
        globals: true,
        setupFiles: ['./vitest-setup.ts'],
      },
    })
  )
)
