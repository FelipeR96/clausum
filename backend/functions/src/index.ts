import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import { getCorsOptions } from './config/cors';
import type { User } from '@clausum/shared';
import { deepseekApiKeySecret } from './config/env';
import { authenticate, AuthenticatedRequest } from './middleware/authenticate';
import { errorHandler } from './middleware/errorHandler';
import { asyncHandler } from './middleware/asyncHandler';
import { adminDb } from './firebase/admin';
import { analysisRouter } from './routes/analysis.routes';
import { subscriptionRouter } from './routes/subscription.routes';
import { contractRouter } from './routes/contract.routes';
import { legalRouter } from './routes/legal.routes';
import { alertsRouter } from './routes/alerts.routes';
import { billingRouter } from './routes/billing.routes';
import { getSubscriptionSummary } from './services/subscription.service';

const app = express();

app.use(cors(getCorsOptions()));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'clausum-api', version: '0.2.0' });
});

app.get(
  '/api/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const doc = await adminDb().collection('users').doc(uid).get();
    const subscription = await getSubscriptionSummary(uid);

    if (!doc.exists) {
      res.json({
        uid,
        planId: subscription.planId,
        subscription,
      });
      return;
    }

    const data = doc.data() as User;
    res.json({ uid, ...data, subscription });
  })
);

app.use('/api', analysisRouter);
app.use('/api', subscriptionRouter);
app.use('/api', billingRouter);
app.use('/api', contractRouter);
app.use('/api', legalRouter);
app.use('/api', alertsRouter);

app.use(errorHandler);

export const api = onRequest(
  {
    region: 'us-east1',
    timeoutSeconds: 300,
    memory: '2GiB',
    secrets: [deepseekApiKeySecret],
  },
  app
);

export { wompiRenewalScheduler } from './schedulers/wompi-renewal.scheduler';
export { storageCleanupScheduler } from './schedulers/storage-cleanup.scheduler';
