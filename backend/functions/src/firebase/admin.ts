import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let app: App;
let firestore: Firestore | undefined;

/**
 * Inicializa Firebase Admin SDK.
 * En producción usa credenciales automáticas de Google Cloud.
 * En emuladores usa el proyecto por defecto sin service account.
 */
export function getAdminApp(): App {
  if (!getApps().length) {
    app = initializeApp();
  } else {
    app = getApps()[0];
  }
  return app;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => {
  if (!firestore) {
    firestore = getFirestore(getAdminApp());
    firestore.settings({ ignoreUndefinedProperties: true });
  }
  return firestore;
};
export const adminStorage = () => getStorage(getAdminApp());
