import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  listUserAlerts,
  markAlertRead,
  markAllAlertsRead,
} from '../services/alerts.service';

export const alertsRouter = Router();

alertsRouter.get(
  '/alerts',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const alerts = await listUserAlerts(uid, limit);
    const unreadCount = alerts.filter((alert) => !alert.read).length;
    res.json({ alerts, unreadCount });
  })
);

alertsRouter.post(
  '/alerts/read-all',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const updated = await markAllAlertsRead(uid);
    res.json({ updated });
  })
);

alertsRouter.post(
  '/alerts/:alertId/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const alert = await markAlertRead(uid, String(req.params.alertId));
    res.json({ alert });
  })
);
