import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

export const PROJECT_ID = 'clausum-test';

/** Dueño de los datos en las pruebas. */
export const OWNER = 'user-owner';
/** Un tercero autenticado: no debe poder ver nada del dueño. */
export const INTRUDER = 'user-intruder';

const FIREBASE_DIR = join(__dirname, '..');

export async function createTestEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(join(FIREBASE_DIR, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: readFileSync(join(FIREBASE_DIR, 'storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });
}

/** Un documento de contrato mínimo y válido, como lo escribe el backend. */
export function contractDoc(userId = OWNER, overrides: Record<string, unknown> = {}) {
  return {
    userId,
    title: 'Contrato de arrendamiento',
    fileName: 'contrato.pdf',
    storagePath: `users/${userId}/contracts/abc123.pdf`,
    status: 'uploaded',
    createdAt: new Date(),
    ...overrides,
  };
}

/** Un usuario recién registrado, como lo crea el cliente al hacer signup. */
export function userDoc(overrides: Record<string, unknown> = {}) {
  return {
    email: 'alguien@ejemplo.com',
    planId: 'free',
    createdAt: new Date(),
    ...overrides,
  };
}

/** Un archivo de 1KB que pasa por PDF. */
export function fakePdf(sizeBytes = 1024): Uint8Array {
  return new Uint8Array(sizeBytes);
}
