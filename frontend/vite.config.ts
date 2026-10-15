import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const projectId = env.VITE_FIREBASE_PROJECT_ID || 'clausum-dev';
  const functionsHost =
    env.VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@clausum/shared': path.resolve(__dirname, '../shared/src/index.ts'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Separar las dependencias que cambian poco de las que cambian en
          // cada despliegue: así una release de la app no invalida la caché
          // de React ni del SDK de Firebase en los navegadores que ya los
          // tienen.
          //
          // Firestore y Storage van en su propio grupo porque solo los usa
          // la app autenticada: con las rutas de /panel diferidas, un
          // visitante anónimo que llega a una landing no los descarga.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;

            if (id.includes('node_modules/react-router')) return 'vendor-router';
            if (
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (
              id.includes('@firebase/firestore') ||
              id.includes('@firebase/storage')
            ) {
              return 'vendor-firebase-data';
            }
            if (id.includes('@firebase/') || id.includes('node_modules/firebase/')) {
              return 'vendor-firebase-core';
            }

            return undefined;
          },
        },
      },
    },
    server: {
      port: 5173,
      // /api/* → emulador Functions: /{project}/us-east1/api/api/*
      proxy: {
        '/api': {
          target: `http://${functionsHost}`,
          changeOrigin: true,
          rewrite: (requestPath) =>
            requestPath.replace(
              /^\/api/,
              `/${projectId}/us-east1/api/api`
            ),
        },
      },
    },
  };
});
