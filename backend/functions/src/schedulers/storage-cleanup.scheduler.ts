import { onSchedule } from 'firebase-functions/v2/scheduler';
import { adminStorage } from '../firebase/admin';
import { logger } from '../utils/logger';

const DEFAULT_EXPORT_RETENTION_DAYS = 30;

function getExportRetentionDays(): number {
  const raw = process.env.STORAGE_EXPORT_RETENTION_DAYS;
  const parsed = raw ? Number(raw) : DEFAULT_EXPORT_RETENTION_DAYS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EXPORT_RETENTION_DAYS;
}

/** Elimina PDFs exportados antiguos (regenerables) para controlar costo de Storage. */
export const storageCleanupScheduler = onSchedule(
  {
    schedule: 'every day 04:00',
    timeZone: 'America/Bogota',
    region: 'us-east1',
  },
  async () => {
    const retentionDays = getExportRetentionDays();
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const bucket = adminStorage().bucket();
    const [files] = await bucket.getFiles({ prefix: 'users/' });

    let deleted = 0;
    let scanned = 0;

    for (const file of files) {
      if (!file.name.includes('/exports/')) continue;
      scanned += 1;

      const [metadata] = await file.getMetadata();
      const created = metadata.timeCreated ? new Date(metadata.timeCreated).getTime() : 0;
      if (created > 0 && created < cutoff) {
        await file.delete({ ignoreNotFound: true });
        deleted += 1;
      }
    }

    logger.info('api', 'Limpieza de exports en Storage completada', {
      metadata: { scanned, deleted, retentionDays },
    });
  }
);
