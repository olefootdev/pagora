/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    // Os testes de src/ são de UI/domínio e rodam em jsdom. Os de
    // supabase/tests/ sobem um Postgres (PGlite) em WASM e precisam de node —
    // jsdom não tem o que o módulo do banco espera do ambiente.
    environmentMatchGlobs: [['supabase/tests/**', 'node']],
    // Boot do Postgres + 8 migrations leva alguns segundos por arquivo.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
} as Parameters<typeof defineConfig>[0]);
