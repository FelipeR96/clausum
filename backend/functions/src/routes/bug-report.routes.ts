import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validateRequest';
import { crearBugReport } from '../services/bug-report.service';

export const bugReportRouter = Router();

const bodySchema = z.object({
  descripcion: z.string().min(1).max(4000),
  ruta: z.string().max(200).optional(),
});

/**
 * Reportar un error.
 *
 * El uid y el correo salen del token, no del cuerpo: si vinieran del
 * navegador, cualquiera podria reportar a nombre de otro. El plan lo
 * resuelve el servidor por la misma razon.
 */
bugReportRouter.post(
  '/bugs',
  authenticate,
  validateBody(bodySchema),
  asyncHandler(async (req, res) => {
    const { uid, email } = req as AuthenticatedRequest;
    const { descripcion, ruta } = (
      req as AuthenticatedRequest & {
        validatedBody: { descripcion: string; ruta?: string };
      }
    ).validatedBody;

    const resultado = await crearBugReport({
      userId: uid,
      email,
      descripcion,
      ruta,
      // El navegador lo manda solo; no hace falta pedirselo al usuario y
      // es justo lo que falta cuando algo falla en un navegador concreto.
      userAgent: req.get('user-agent') ?? undefined,
    });

    res.status(201).json(resultado);
  })
);
