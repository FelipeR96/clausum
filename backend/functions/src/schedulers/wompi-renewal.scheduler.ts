import { onSchedule } from 'firebase-functions/v2/scheduler';
import { processDueWompiRenewals } from '../services/wompi.service';
import { ALL_SECRETS } from '../config/env';
import { logger } from '../utils/logger';

/** Intenta renovaciones Wompi una vez al día (usuarios con fuente de pago activa). */
export const wompiRenewalScheduler = onSchedule(
  {
    schedule: 'every day 06:00',
    timeZone: 'America/Bogota',
    region: 'us-east1',
    // Las renovaciones recurrentes necesitan las credenciales igual
    // que los endpoints: sin esto el scheduler corre sin acceso.
    secrets: ALL_SECRETS,
  },
  async () => {
    const result = await processDueWompiRenewals();
    logger.info('wompi', 'Scheduler de renovación Wompi ejecutado', {
      metadata: result,
    });
  }
);
