import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  assertRecentAuth,
  deleteAccount,
  exportAccountData,
} from '../services/account.service';

export const accountRouter = Router();

/**
 * Supresión de cuenta (Ley 1581 de 2012).
 *
 * Exige reautenticación reciente: el token tiene que venir de un login de
 * hace menos de cinco minutos, no de un refresco automático. El frontend
 * pide la contraseña y llama a `reauthenticateWithCredential` antes de
 * tocar este endpoint.
 */
accountRouter.delete(
  '/account',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid, authTime } = req as AuthenticatedRequest;

    assertRecentAuth(authTime);

    const result = await deleteAccount(uid);
    res.status(200).json({ deleted: true, ...result });
  })
);

/** Portabilidad de datos: todo lo que la plataforma guarda del usuario. */
accountRouter.get(
  '/account/export',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const data = await exportAccountData(uid);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="clausum-mis-datos-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.status(200).send(JSON.stringify(data, null, 2));
  })
);
