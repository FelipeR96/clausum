import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validateRequest';
import { adminDb } from '../firebase/admin';
import { COLLECTIONS } from '@clausum/shared';
import type { User } from '@clausum/shared';
import {
  createWompiCheckout,
  completeWompiSubscription,
  cancelWompiSubscription,
  getWompiSubscribeConfig,
  handleWompiWebhook,
  isWompiConfigured,
  isWompiRecurrentConfigured,
  type WompiWebhookEvent,
} from '../services/wompi.service';
import {
  createPayPalSubscription,
  cancelPayPalSubscription,
  handlePayPalWebhook,
  isPayPalConfigured,
} from '../services/paypal.service';
import { AppError } from '../utils/errors';

export const billingRouter = Router();

const checkoutBodySchema = z.object({
  interval: z.enum(['monthly', 'annual']),
});

const wompiSubscribeBodySchema = z.object({
  interval: z.enum(['monthly', 'annual']),
  reference: z.string().min(8),
  paymentToken: z.string().min(8),
});

billingRouter.get(
  '/billing/wompi/status',
  asyncHandler(async (_req, res) => {
    res.json({
      configured: isWompiConfigured(),
      recurrent: isWompiRecurrentConfigured(),
    });
  })
);

billingRouter.get(
  '/billing/paypal/status',
  asyncHandler(async (_req, res) => {
    res.json({ configured: isPayPalConfigured() });
  })
);

billingRouter.post(
  '/billing/wompi/checkout',
  authenticate,
  validateBody(checkoutBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const { interval } = (req as AuthenticatedRequest & {
      validatedBody: { interval: 'monthly' | 'annual' };
    }).validatedBody;

    const userDoc = await adminDb().collection(COLLECTIONS.users).doc(uid).get();
    const user = userDoc.data() as Partial<User> | undefined;
    const email = user?.email;
    const billingRegion = user?.billingRegion ?? 'CO';

    if (billingRegion === 'LATAM') {
      throw new AppError(
        'Wompi solo está disponible para Colombia. Selecciona Colombia en precios o usa PayPal.',
        400,
        'WOMPI_REGION_MISMATCH'
      );
    }

    if (!email) {
      throw new AppError('Tu cuenta no tiene correo electrónico asociado', 400);
    }

    const checkout = await createWompiCheckout(
      uid,
      email,
      user?.displayName,
      interval
    );

    res.json(checkout);
  })
);

billingRouter.post(
  '/billing/wompi/subscribe-config',
  authenticate,
  validateBody(checkoutBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const { interval } = (req as AuthenticatedRequest & {
      validatedBody: { interval: 'monthly' | 'annual' };
    }).validatedBody;

    const config = await getWompiSubscribeConfig(uid, interval);
    res.json(config);
  })
);

billingRouter.post(
  '/billing/wompi/subscribe',
  authenticate,
  validateBody(wompiSubscribeBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const { interval, reference, paymentToken } = (req as AuthenticatedRequest & {
      validatedBody: {
        interval: 'monthly' | 'annual';
        reference: string;
        paymentToken: string;
      };
    }).validatedBody;

    const userDoc = await adminDb().collection(COLLECTIONS.users).doc(uid).get();
    const user = userDoc.data() as Partial<User> | undefined;
    const email = user?.email;

    if (!email) {
      throw new AppError('Tu cuenta no tiene correo electrónico asociado', 400);
    }

    const result = await completeWompiSubscription(
      uid,
      email,
      interval,
      reference,
      paymentToken
    );
    res.json(result);
  })
);

billingRouter.post(
  '/billing/wompi/cancel',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    await cancelWompiSubscription(uid);
    res.json({
      message:
        'Renovación automática cancelada. Conservas Pro hasta el fin del periodo pagado.',
    });
  })
);

billingRouter.post(
  '/billing/paypal/subscribe',
  authenticate,
  validateBody(checkoutBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const { interval } = (req as AuthenticatedRequest & {
      validatedBody: { interval: 'monthly' | 'annual' };
    }).validatedBody;

    const userDoc = await adminDb().collection(COLLECTIONS.users).doc(uid).get();
    const user = userDoc.data() as Partial<User> | undefined;
    const email = user?.email;

    if (!email) {
      throw new AppError('Tu cuenta no tiene correo electrónico asociado', 400);
    }

    const result = await createPayPalSubscription(uid, email, interval);
    res.json(result);
  })
);

billingRouter.post(
  '/billing/paypal/cancel',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    await cancelPayPalSubscription(uid);
    res.json({ message: 'Renovación automática cancelada. Conservas Pro hasta el fin del periodo pagado.' });
  })
);

billingRouter.post(
  '/billing/wompi/webhook',
  asyncHandler(async (req, res) => {
    await handleWompiWebhook(req.body as WompiWebhookEvent);
    res.status(200).json({ received: true });
  })
);

billingRouter.post(
  '/billing/paypal/webhook',
  asyncHandler(async (req, res) => {
    await handlePayPalWebhook(req.headers, req.body);
    res.status(200).json({ received: true });
  })
);
