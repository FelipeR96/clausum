import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'backend/functions/src/**/*.test.ts',
      'backend/functions/src/**/__tests__/**/*.test.ts',
      'backend/firebase/tests/**/*.test.ts',
      'shared/src/**/*.test.ts',
    ],
    environment: 'node',
    // Las pruebas de reglas hablan con los emuladores: sin paralelismo entre
    // archivos para que no se pisen los datos.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['backend/functions/src/**', 'shared/src/**'],
      exclude: ['**/*.test.ts', '**/__tests__/**', '**/types/**'],
    },
  },
});
