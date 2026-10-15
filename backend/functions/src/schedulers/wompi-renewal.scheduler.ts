import { onSchedule } from 'firebase-functions/v2/scheduler';
import { processDueWompiRenewals } from '../services/wompi.service';
import { logger } from '../utils/logger';

/** Intenta renovaciones Wompi una vez al día (usuarios con fuente de pago activa). */
export const wompiRenewalScheduler = onSchedule(
  {
    schedule: 'every day 06:00',
    timeZone: 'America/Bogota',
    region: 'us-east1',
  },
  async () => {
    const result = await processDueWompiRenewals();
    logger.info('wompi', 'Scheduler de renovación Wompi ejecutado', {
      metadata: result,
    });
  }
);
