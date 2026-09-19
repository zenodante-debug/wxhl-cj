import { fileURLToPath } from 'node:url';
import unpluginAutoImport from 'unplugin-auto-import/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@util': fileURLToPath(new URL('./util', import.meta.url)),
    },
  },
  plugins: [
    unpluginAutoImport({
      dts: false,
      imports: [
        'vue',
        'pinia',
        '@vueuse/core',
        { from: 'dedent', imports: [['default', 'dedent']] },
        { from: 'klona', imports: ['klona'] },
        { from: 'vue-final-modal', imports: ['useModal'] },
        { from: 'zod', imports: ['z'] },
      ],
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    setupFiles: ['src/wxhl-003/__tests__/setup.ts'],
  },
});
