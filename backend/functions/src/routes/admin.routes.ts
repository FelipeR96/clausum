import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validateRequest';
import {
  findUserByEmail,
  setUserPlanAsAdmin,
  updatePlanLimits,
  updatePricing,
} from '../services/admin.service';
import { getPricing } from '../config/pricing';
import { getPlanBySlug } from '../config/plans';
import type { PlanSlug } from '@clausum/shared';

/**
 * Modulo de administracion.
 *
 * Todas las rutas llevan `authenticate` y despues `requireAdmin`, que
 * responde 404 a quien no lo sea. El orden importa: sin authenticate antes,
 * requireAdmin no tendria token que mirar.
 */
export const adminRouter = Router();

/**
 * @types/express v5 tipa los parametros de ruta como `string | string[]`,
 * porque una ruta puede repetir un nombre. Aqui nunca pasa, pero el tipo
 * obliga a decidirlo explicitamente en vez de confiar en que no ocurra.
 */
function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

adminRouter.use('/admin', authenticate, requireAdmin);

// ── Usuarios ─────────────────────────────────────────────────────────────

adminRouter.get(
  '/admin/users',
  asyncHandler(async (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
    if (!email) {
      res.status(400).json({ error: 'Falta el correo a buscar' });
      return;
    }
    res.json(await findUserByEmail(email));
  })
);

const planBodySchema = z.object({
  planId: z.enum(['free', 'pro']),
  /**
   * Cuantos dias dura la concesion. Una concesion manual sin fecha de fin
   * seria Pro para siempre sin que nadie lo recuerde.
   */
  days: z.number().int().min(1).max(3650).optional(),
});

adminRouter.post(
  '/admin/users/:uid/plan',
  validateBody(planBodySchema),
  asyncHandler(async (req, res) => {
    const { uid: adminUid } = req as AuthenticatedRequest;
    const { planId, days } = (
      req as AuthenticatedRequest & {
        validatedBody: { planId: PlanSlug; days?: number };
      }
    ).validatedBody;

    const target = routeParam(req.params.uid);
    if (target === adminUid && planId === 'free') {
      // No es una restriccion de seguridad (el claim de admin no depende del
      // plan), pero quitarse Pro a uno mismo sin querer mientras se prueba
      // es facil y confuso.
      res.status(400).json({
        error: 'No puedes quitarte el plan a ti mismo desde aquí. Usa otra cuenta de prueba.',
      });
      return;
    }

    res.json(await setUserPlanAsAdmin(adminUid, target, planId, { days }));
  })
);

// ── Precios ──────────────────────────────────────────────────────────────

adminRouter.get(
  '/admin/pricing',
  asyncHandler(async (_req, res) => {
    const pricing = await getPricing();
    res.json({
      CO: pricing.CO,
      LATAM: pricing.LATAM,
      updatedAt: pricing.updatedAt?.toDate?.().toISOString(),
      updatedBy: pricing.updatedBy,
    });
  })
);

adminRouter.put(
  '/admin/pricing',
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const pricing = await updatePricing(uid, req.body);
    res.json({
      ...pricing,
      message:
        'Precios actualizados. Afecta a cobros nuevos; quien ya está suscrito mantiene el suyo.',
    });
  })
);

// ── Limites de los planes ────────────────────────────────────────────────

adminRouter.get(
  '/admin/plans/:slug',
  asyncHandler(async (req, res) => {
    const slug = routeParam(req.params.slug) as PlanSlug;
    if (slug !== 'free' && slug !== 'pro') {
      res.status(404).json({ error: 'Plan desconocido' });
      return;
    }
    const plan = await getPlanBySlug(slug);
    res.json(plan ?? { error: 'Plan no encontrado' });
  })
);

adminRouter.put(
  '/admin/plans/:slug/limits',
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const slug = routeParam(req.params.slug) as PlanSlug;
    if (slug !== 'free' && slug !== 'pro') {
      res.status(404).json({ error: 'Plan desconocido' });
      return;
    }
    const limits = await updatePlanLimits(uid, slug, req.body);
    res.json({ slug, limits });
  })
);
