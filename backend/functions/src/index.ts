import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import { getCorsOptions } from './config/cors';
import type { User } from '@clausum/shared';
import { ALL_SECRETS } from './config/env';
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
import { accountRouter } from './routes/account.routes';
import { adminRouter } from './routes/admin.routes';
import { getSubscriptionSummary } from './services/subscription.service';
import { getPricing } from './config/pricing';

const app = express();

app.use(cors(getCorsOptions()));

// Los bodies de la API son diminutos (ids y opciones), así que un límite
// bajo es gratis y reduce superficie de abuso. Los webhooks de las
// pasarelas son la excepción: si Wompi o PayPal engordan el payload de un
// evento, un 413 significa perder la notificación de un pago.
app.use('/api/billing/wompi/webhook', express.json({ limit: '5mb' }));
app.use('/api/billing/paypal/webhook', express.json({ limit: '5mb' }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'clausum-api', version: '0.2.0' });
});

/**
 * Precios vigentes. Publico y sin autenticar: la pagina de precios la ve
 * cualquiera, y es la misma fuente que usa el cobro. Si esto y el checkout
 * dijeran cosas distintas, estariamos mostrando un precio y cobrando otro.
 */
app.get(
  '/api/pricing',
  asyncHandler(async (_req, res) => {
    const pricing = await getPricing();
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      CO: pricing.CO,
      LATAM: pricing.LATAM,
      updatedAt: pricing.updatedAt?.toDate?.().toISOString(),
    });
  })
);

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
app.use('/api', accountRouter);
app.use('/api', adminRouter);

app.use(errorHandler);

export const api = onRequest(
  {
    region: 'us-east1',
    // La API ya no hace trabajo de IA: valida, encola y responde. El
    // presupuesto largo vive en las tareas (tasks/jobs.task.ts).
    timeoutSeconds: 120,
    memory: '1GiB',
    // Techo de instancias: sin esto un pico de tráfico escala sin límite y
    // la factura con él.
    maxInstances: 20,
    secrets: ALL_SECRETS,
  },
  app
);

export { wompiRenewalScheduler } from './schedulers/wompi-renewal.scheduler';
export { storageCleanupScheduler } from './schedulers/storage-cleanup.scheduler';

// Colas de trabajo: analizar, detectar riesgos y comparar.
export {
  processAnalysisTask,
  processRisksTask,
  processComparisonTask,
} from './tasks/jobs.task';
