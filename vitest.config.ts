import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/testes/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.{ts,mjs}'],
    exclude: ['e2e/**', 'node_modules/**'],
    // Os testes de marca leem os .css como texto (?raw); por padrão o Vitest devolve string vazia para CSS.
    css: { include: [/\.css\?raw$/] },
  },
});
