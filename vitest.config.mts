import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// @clausum/shared ya no es una dependencia declarada de ningun paquete: npm
// no entiende el protocolo `workspace:` de pnpm y rompia el despliegue de
// las Cloud Functions. Se resuelve por ruta, igual que en tsconfig y en el
// bundle de esbuild.
const sharedEntry = fileURLToPath(new URL('./shared/src/index.ts', import.meta.url));
const frontendSrc = fileURLToPath(new URL('./frontend/src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@clausum/shared': sharedEntry,
      // El mismo alias que usa vite.config.ts del frontend.
      '@': frontendSrc,
    },
  },
  test: {
    include: [
      'backend/functions/src/**/*.test.ts',
      'backend/functions/src/**/__tests__/**/*.test.ts',
      'backend/firebase/tests/**/*.test.ts',
      'shared/src/**/*.test.ts',
      // El frontend no tenia ni una prueba corriendo. Entra con las de
      // SEO, que generan artefactos que nadie mira antes de produccion.
      'frontend/src/**/*.test.ts',
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
      include: ['backend/functions/src/**', 'shared/src/**', 'frontend/src/**'],
      exclude: ['**/*.test.ts', '**/__tests__/**', '**/types/**'],
    },
  },
});
