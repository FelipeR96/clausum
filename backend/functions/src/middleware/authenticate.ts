import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../firebase/admin';

export interface AuthenticatedRequest extends Request {
  uid: string;
  email?: string;
  /**
   * Momento (epoch en segundos) en que el usuario se autenticó de verdad,
   * no cuando se refrescó el token. Es lo que permite exigir
   * reautenticación reciente para operaciones destructivas sin que el
   * servidor tenga que manejar contraseñas.
   */
  authTime?: number;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    (req as AuthenticatedRequest).uid = decoded.uid;
    (req as AuthenticatedRequest).email = decoded.email;
    (req as AuthenticatedRequest).authTime = decoded.auth_time;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
