import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/firebase/auth';
import { apiClient } from '@/services/api/client';
import { ApiError } from '@/services/api/errors';

/**
 * Reautentica al usuario y refresca el token.
 *
 * El refresco forzado no es opcional: el backend exige que `auth_time` sea
 * reciente, y `getIdToken()` sin argumentos devuelve el token en caché, que
 * sigue llevando el `auth_time` del login anterior. Sin el `true`, el
 * servidor rechazaría con REAUTH_REQUIRED justo después de que el usuario
 * acabe de escribir su contraseña.
 */
async function reauthenticate(password?: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new ApiError('No hay sesión activa.', 401, 'NO_SESSION');
  }

  const usesPassword = user.providerData.some((p) => p.providerId === 'password');

  if (usesPassword) {
    if (!user.email || !password) {
      throw new ApiError(
        'Introduce tu contraseña para confirmar.',
        400,
        'PASSWORD_REQUIRED'
      );
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  } else {
    // Cuentas de Google: no hay contraseña que pedir, se reabre el popup.
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  }

  await user.getIdToken(true);
}

/**
 * Elimina la cuenta de forma permanente.
 *
 * El backend cancela la suscripción en la pasarela antes de borrar nada y
 * conserva los pagos anonimizados, que es una obligación tributaria.
 */
export async function deleteAccount(password?: string): Promise<{
  paymentsAnonymized: number;
  warnings: string[];
}> {
  await reauthenticate(password);

  return apiClient<{ paymentsAnonymized: number; warnings: string[] }>('/account', {
    method: 'DELETE',
  });
}

/** Descarga todo lo que la plataforma guarda del usuario, en JSON. */
export async function downloadAccountData(): Promise<void> {
  const data = await apiClient<unknown>('/account/export');

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `clausum-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
