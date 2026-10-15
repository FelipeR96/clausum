export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isQuotaError(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.code === 'QUOTA_COMPARISONS_EXCEEDED' ||
      error.code === 'QUOTA_ANALYSES_EXCEEDED' ||
      error.code === 'CONTRACT_LIMIT')
  );
}

export function isProFeatureError(error: unknown): boolean {
  return isApiError(error) && error.code === 'FEATURE_PRO_REQUIRED';
}
