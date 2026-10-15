import { AppError } from './errors';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  retryOn?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_ON = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  return true;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const retryOn = options.retryOn ?? DEFAULT_RETRY_ON;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !retryOn(error)) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
