import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
} from 'firebase/firestore';
import { getFirebaseApp } from './app';
import { useEmulators, emulatorHosts } from './config';

let db: Firestore;
let emulatorsConnected = false;

export function getFirebaseFirestore(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());

    if (useEmulators && !emulatorsConnected) {
      const [host, port] = emulatorHosts.firestore.split(':');
      connectFirestoreEmulator(db, host, Number(port));
      emulatorsConnected = true;
    }
  }
  return db;
}
