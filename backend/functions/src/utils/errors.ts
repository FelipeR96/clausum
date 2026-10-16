export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Si vale la pena reintentar un trabajo que fallo con este error.
 *
 * Un 4xx es una respuesta sobre la peticion, no sobre el servicio: el
 * plan no incluye OCR, el archivo no es valido, la cuota se agoto.
 * Reintentarlo da el mismo resultado tres veces y, mientras tanto, al
 * usuario se le muestra "Reintentando..." en lugar del motivo real,
 * que ya sabemos desde el primer intento.
 *
 * Todo lo demas (red, 5xx, timeouts del modelo) si se reintenta.
 */
export function esReintentable(error: unknown): boolean {
  if (!isAppError(error)) return true;
  return error.statusCode >= 500;
}
