import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validateRequest';
import {
  findUserByEmail,
  getIngresos,
  listUsers,
  setUserPlanAsAdmin,
  updatePlanLimits,
  updatePricing,
} from '../services/admin.service';
import {
  cambiarEstadoBugReport,
  listarBugReports,
} from '../services/bug-report.service';
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

    // Con correo, busca uno concreto; sin el, lista paginada. Son dos
    // formas de lo mismo y separarlas en dos rutas no aportaria nada.
    if (email) {
      res.json(await findUserByEmail(email));
      return;
    }

    const planId =
      req.query.plan === 'pro' || req.query.plan === 'free'
        ? (req.query.plan as PlanSlug)
        : undefined;
    const limit =
      typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const cursor =
      typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const estado =
      typeof req.query.estado === 'string' && req.query.estado
        ? req.query.estado
        : undefined;
    const orden = req.query.orden === 'vencimiento' ? 'vencimiento' : 'recientes';
    const buscar =
      typeof req.query.buscar === 'string' && req.query.buscar.trim()
        ? req.query.buscar.trim()
        : undefined;

    res.json(
      await listUsers({
        planId,
        estado,
        email: buscar,
        orden,
        limit: Number.isFinite(limit) ? limit : undefined,
        cursor,
      })
    );
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

    // Cambiarse el plan a uno mismo esta permitido, incluido quitarse Pro:
    // es la forma normal de probar como se ve el producto en Free sin
    // crear una cuenta aparte. El claim de admin no depende del plan, asi
    // que no hay forma de quedarse fuera del modulo por esta via.
    const target = routeParam(req.params.uid);

    res.json(await setUserPlanAsAdmin(adminUid, target, planId, { days }));
  })
);

// ── Reportes de errores ──────────────────────────────────────────────────

adminRouter.get(
  '/admin/bugs',
  asyncHandler(async (req, res) => {
    const estado =
      req.query.estado === 'abierto' || req.query.estado === 'resuelto'
        ? req.query.estado
        : undefined;
    res.json(await listarBugReports({ estado }));
  })
);

const bugEstadoSchema = z.object({ estado: z.enum(['abierto', 'resuelto']) });

adminRouter.post(
  '/admin/bugs/:id/estado',
  validateBody(bugEstadoSchema),
  asyncHandler(async (req, res) => {
    const { uid: adminUid } = req as AuthenticatedRequest;
    const { estado } = (
      req as AuthenticatedRequest & {
        validatedBody: { estado: 'abierto' | 'resuelto' };
      }
    ).validatedBody;

    await cambiarEstadoBugReport(adminUid, routeParam(req.params.id), estado);
    res.json({ ok: true });
  })
);

// ── Ingresos ─────────────────────────────────────────────────────────────

adminRouter.get(
  '/admin/ingresos',
  asyncHandler(async (req, res) => {
    // Por defecto, el mes en curso: es lo que uno quiere mirar al entrar.
    const ahora = new Date();
    const pordefectoDesde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const desde =
      typeof req.query.desde === 'string' ? new Date(req.query.desde) : pordefectoDesde;
    const hasta =
      typeof req.query.hasta === 'string' ? new Date(req.query.hasta) : ahora;

    if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
      res.status(400).json({ error: 'Fechas inválidas' });
      return;
    }
    if (desde.getTime() > hasta.getTime()) {
      res.status(400).json({ error: 'La fecha de inicio es posterior a la de fin' });
      return;
    }

    res.json(await getIngresos({ desde, hasta }));
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
