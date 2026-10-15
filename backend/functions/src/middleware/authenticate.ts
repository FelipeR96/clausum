import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../firebase/admin';

export interface AuthenticatedRequest extends Request {
  uid: string;
  email?: string;
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
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
