import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import { logger } from '../utils/logger';

/**
 * Exige el custom claim `admin` del token.
 *
 * Va siempre DESPUES de `authenticate`, que es quien verifica la firma del
 * token y deja `isAdmin` en la request.
 *
 * Devuelve 404, no 403, a proposito: un 403 confirma que la ruta existe.
 * Para quien no es administrador, el modulo de administracion sencillamente
 * no esta ahi.
 *
 * El intento queda registrado: que alguien toque /admin sin serlo es
 * informacion que conviene tener.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const { uid, isAdmin } = req as AuthenticatedRequest;

  if (!isAdmin) {
    logger.warn('api', 'Acceso denegado a ruta de administracion', {
      userId: uid,
      metadata: { ruta: req.originalUrl, metodo: req.method },
    });
    res.status(404).json({ error: 'No encontrado' });
    return;
  }

  next();
}
