/**
 * Configuración de Firebase leída desde variables de entorno de Vite.
 * Todas empiezan con VITE_ para que Vite las exponga al bundle del cliente.
 *
 * IMPORTANTE: estas claves son públicas por diseño. La seguridad real
 * está en Firestore Rules, Storage Rules y la verificación de tokens en Functions.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} as const;

export const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

export const emulatorHosts = {
  auth: import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099',
  firestore: import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080',
  storage: import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199',
  functions: import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1:5001',
} as const;

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
