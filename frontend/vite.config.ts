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
