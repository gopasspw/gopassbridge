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
    },
  },
  resolve: {
    alias: {
      'gopassbridge/web-extension': '/web-extension',
    },
  },
});
