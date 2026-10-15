import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './config';

let app: FirebaseApp;

/**
 * Singleton de la app Firebase.
 * initializeApp solo debe llamarse una vez en toda la aplicación.
 */
export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
}
