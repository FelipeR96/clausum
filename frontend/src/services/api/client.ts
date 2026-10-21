// Del módulo concreto, no del barrel '@/firebase': ese reexporta
// ./firestore y ./storage, y este archivo lo importa casi todo el
// frontend. Pasar por el barrel metía ~460 kB de SDK en el chunk de
// entrada de cualquier página, incluidas las landings públicas.
import { getFirebaseAuth } from '@/firebase/auth';
import { apiBaseUrl } from '@/firebase/config';
import { ApiError } from '@/services/api/errors';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

/**
 * Petición autenticada hacia Cloud Functions, sin interpretar la respuesta.
 * Adjunta el token JWT del usuario y convierte los errores HTTP en ApiError.
 */
async function peticionAutenticada(
  path: string,
  options: RequestInit
): Promise<Response> {
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

  return response;
}

/** Cliente HTTP hacia Cloud Functions, para respuestas JSON. */
export async function apiClient<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await peticionAutenticada(path, options);
  return response.json() as Promise<T>;
}

/**
 * Igual que apiClient, pero para respuestas binarias.
 *
 * Un PDF no sobrevive a response.json(). El informe vuelve como archivo por
 * esta conexión ya autenticada, en vez de por una URL pública de Storage.
 */
export async function apiClientBlob(
  path: string,
  options: RequestInit = {}
): Promise<{ blob: Blob; fileName?: string }> {
  const response = await peticionAutenticada(path, options);
  return {
    blob: await response.blob(),
    fileName: nombreDelArchivo(response.headers.get('Content-Disposition')),
  };
}

/**
 * Saca el nombre de una cabecera `attachment; filename="informe.pdf"`.
 *
 * Devuelve undefined si no viene: el navegador solo deja leer esa cabecera
 * si el servidor la expone en CORS, así que quien llame debe tener un
 * nombre de respaldo.
 */
function nombreDelArchivo(contentDisposition: string | null): string | undefined {
  if (!contentDisposition) return undefined;
  const encontrado = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
  if (!encontrado) return undefined;
  try {
    return decodeURIComponent(encontrado[1]);
  } catch {
    return encontrado[1];
  }
}
