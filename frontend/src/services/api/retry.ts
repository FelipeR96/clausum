import { isApiError } from '@/services/api/errors';

const RETRYABLE_STATUSES = new Set([404, 502, 503, 504]);

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Reintenta peticiones cuando el emulador de Functions aún no está listo. */
export async function withApiRetry<T>(
  fn: () => Promise<T>,
  options?: { attempts?: number; baseDelayMs?: number }
): Promise<T> {
  const attempts = options?.attempts ?? 4;
  const baseDelayMs = options?.baseDelayMs ?? 1200;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const shouldRetry =
        isApiError(error) &&
        RETRYABLE_STATUSES.has(error.status) &&
        attempt < attempts - 1;

      if (!shouldRetry) {
        throw error;
      }

      await wait(baseDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}
