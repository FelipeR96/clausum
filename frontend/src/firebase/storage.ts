import {
  getStorage,
  connectStorageEmulator,
  FirebaseStorage,
} from 'firebase/storage';
import { getFirebaseApp } from './app';
import { useEmulators, emulatorHosts } from './config';

let storage: FirebaseStorage;
let emulatorsConnected = false;

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());

    if (useEmulators && !emulatorsConnected) {
      const [host, port] = emulatorHosts.storage.split(':');
      connectStorageEmulator(storage, host, Number(port));
      emulatorsConnected = true;
    }
  }
  return storage;
}

/**
 * Ruta estándar para PDFs de contratos en Storage.
 * Debe coincidir con storage.rules: users/{userId}/contracts/{fileName}
 */
export function contractStoragePath(userId: string, contractId: string): string {
  return `users/${userId}/contracts/${contractId}.pdf`;
}

const AVATAR_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function profileAvatarStoragePath(userId: string, contentType: string): string {
  const ext = AVATAR_EXT[contentType] ?? 'jpg';
  return `users/${userId}/profile/avatar.${ext}`;
}
