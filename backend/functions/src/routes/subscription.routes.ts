import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validateRequest';
import {
  getSubscriptionSummary,
  setUserPlan,
} from '../services/subscription.service';
import { listUserHistory } from '../services/history.service';
import { exportContractPdf } from '../services/export.service';
import { getDashboardSummary } from '../services/dashboard.service';
import { isEmulator } from '../config/env';

export const subscriptionRouter = Router();

subscriptionRouter.get(
  '/subscription',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const summary = await getSubscriptionSummary(uid);
    res.json(summary);
  })
);

subscriptionRouter.get(
  '/dashboard',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const dashboard = await getDashboardSummary(uid);
    res.json(dashboard);
  })
);

subscriptionRouter.get(
  '/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const result = await listUserHistory(uid, limit);
    res.json(result);
  })
);

const exportBodySchema = z.object({
  contractId: z.string().min(1),
});

subscriptionRouter.post(
  '/export',
  authenticate,
  validateBody(exportBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const { contractId } = (req as AuthenticatedRequest & {
      validatedBody: { contractId: string };
    }).validatedBody;
    const { fileName, pdf } = await exportContractPdf(uid, contractId);
    // El PDF vuelve por esta misma conexion, ya autenticada. Quien no tenga
    // sesion no puede leerlo, y no queda ningun enlace publico detras.
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', String(pdf.length));
    res.status(200).send(pdf);
  })
);

/**
 * Solo emulador: simular upgrade a Pro sin pasarela de pago.
 */
const devUpgradeSchema = z.object({
  planId: z.enum(['free', 'pro']),
});

subscriptionRouter.post(
  '/dev/set-plan',
  authenticate,
  validateBody(devUpgradeSchema),
  asyncHandler(async (req, res) => {
    if (!isEmulator()) {
      res.status(404).json({ error: 'No disponible' });
      return;
    }
    const { uid } = req as AuthenticatedRequest;
    const { planId } = (req as AuthenticatedRequest & {
      validatedBody: { planId: 'free' | 'pro' };
    }).validatedBody;

    await setUserPlan(uid, planId, {
      subscriptionStatus: planId === 'pro' ? 'active' : 'canceled',
    });

    const summary = await getSubscriptionSummary(uid);
    res.json({ message: `Plan actualizado a ${planId}`, ...summary });
  })
);
