import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  EmailAuthProvider,
  Auth,
} from 'firebase/auth';
import { getFirebaseApp } from './app';
import { useEmulators, emulatorHosts } from './config';

let auth: Auth;
let emulatorsConnected = false;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());

    if (useEmulators && !emulatorsConnected) {
      connectAuthEmulator(auth, `http://${emulatorHosts.auth}`, {
        disableWarnings: true,
      });
      emulatorsConnected = true;
    }
  }
  return auth;
}

export const googleProvider = new GoogleAuthProvider();
export const emailProvider = EmailAuthProvider;
