import { Request, Response, NextFunction } from 'express';
import { isAppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string | undefined;
  const uid = (req as Request & { uid?: string }).uid;

  if (isAppError(error)) {
    if (error.statusCode >= 500) {
      logger.error('api', error.message, error, { userId: uid, requestId });
    }
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  logger.error('api', 'Error interno no controlado', error, {
    userId: uid,
    requestId,
  });

  res.status(500).json({
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
  });
}
