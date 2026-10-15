import { getFirebaseAuth, apiBaseUrl } from '@/firebase';
import { ApiError } from '@/services/api/errors';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

/**
 * Cliente HTTP hacia Cloud Functions.
 * Adjunta automáticamente el token JWT del usuario autenticado.
 */
export async function apiClient<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (user) {
    const token = await user.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const rawMessage = (body.error as string) ?? `Error HTTP ${response.status}`;
    const code = body.code as string | undefined;
    const provisional = new ApiError(rawMessage, response.status, code);
    throw new ApiError(getUserFacingErrorMessage(provisional), response.status, code);
  }

  return response.json() as Promise<T>;
}
