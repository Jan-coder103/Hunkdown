import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: decodeURIComponent(new URL('./index.html', import.meta.url).pathname),
        assetViewer: decodeURIComponent(new URL('./asset-viewer.html', import.meta.url).pathname),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
  },
});
