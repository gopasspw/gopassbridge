import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    setupFiles: ['./tests/setup.mjs'],
    include: ['tests/**/*.test.mjs'],
    environmentOptions: {
        jsdom: {
            url: 'http://localhost/',
        },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['web-extension/**/*.js'],
      exclude: ['web-extension/lib/**', 'web-extension/vendor/**'],
      thresholds: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    },
    sequence: {
      shuffle: {
        files: true,
        tests: true,
      },
    },
  },
  resolve: {
    alias: {
      'gopassbridge/web-extension': '/web-extension',
    },
  },
});
