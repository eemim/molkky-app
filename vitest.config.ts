import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/lib/molkky.ts', 'src/lib/list.ts'],
      exclude: ['src/**/*.svelte', 'src/main.ts', 'src/app.css'],
    },
  },
});
