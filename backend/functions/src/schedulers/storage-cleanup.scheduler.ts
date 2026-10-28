import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb, adminStorage } from '../firebase/admin';
import { ALL_SECRETS } from '../config/env';
import { borrarAnalisisCaducados } from '../services/single-analysis.service';
import { logger } from '../utils/logger';

const DEFAULT_EXPORT_RETENTION_DAYS = 30;

function getExportRetentionDays(): number {
  const raw = process.env.STORAGE_EXPORT_RETENTION_DAYS;
  const parsed = raw ? Number(raw) : DEFAULT_EXPORT_RETENTION_DAYS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EXPORT_RETENTION_DAYS;
}

const DEFAULT_PENDING_PAYMENT_HOURS = 24;

function getPendingPaymentHours(): number {
  const raw = process.env.PENDING_PAYMENT_EXPIRY_HOURS;
  const parsed = raw ? Number(raw) : DEFAULT_PENDING_PAYMENT_HOURS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PENDING_PAYMENT_HOURS;
}

/**
 * Caduca los pagos que se quedaron en `pending`.
 *
 * Un pago nace en `pending` al pulsar "Pasate a Pro" y solo sale de ahi
 * cuando llega el webhook. Quien abandona el widget o cierra la pestana
 * deja el documento ahi para siempre: nada lo caducaba.
 *
 * No es peligroso —para activarlo haria falta un evento firmado por
 * Wompi sobre esa referencia, y si nadie pago no existe— pero impide
 * distinguir un abandono de un pago en curso, que es justo lo que hay
 * que mirar para saber cuanta gente empieza a pagar y no termina.
 *
 * Se marcan, no se borran: un pago abandonado es un dato de negocio.
 */
export async function expirarPagosPendientes(): Promise<{ revisados: number; caducados: number }> {
  const horas = getPendingPaymentHours();
  const corte = Timestamp.fromMillis(Date.now() - horas * 60 * 60 * 1000);

  const snap = await adminDb()
    .collection(COLLECTIONS.payments)
    .where('status', '==', 'pending')
    .where('createdAt', '<', corte)
    .limit(500)
    .get();

  if (snap.empty) return { revisados: 0, caducados: 0 };

  const batch = adminDb().batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      status: 'expired',
      expiredAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  return { revisados: snap.size, caducados: snap.size };
}

/** Elimina PDFs exportados antiguos (regenerables) para controlar costo de Storage. */
export const storageCleanupScheduler = onSchedule(
  {
    schedule: 'every day 04:00',
    timeZone: 'America/Bogota',
    region: 'us-east1',
    // Las renovaciones recurrentes necesitan las credenciales igual
    // que los endpoints: sin esto el scheduler corre sin acceso.
    secrets: ALL_SECRETS,
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

    // Va en el mismo programador a proposito: es la misma tarea de
    // mantenimiento nocturno y no justifica otra funcion desplegada.
    const pagos = await expirarPagosPendientes();
    if (pagos.caducados > 0) {
      logger.info('api', 'Pagos pendientes caducados', {
        metadata: { ...pagos, horas: getPendingPaymentHours() },
      });
    }

    // Y por la misma razon, el barrido de los analisis sueltos sin cuenta.
    // Cierra el circulo de la promesa: el texto del contrato ya se borro al
    // terminar el analisis, y aqui cae el resultado y todo lo demas.
    const sueltos = await borrarAnalisisCaducados();
    if (sueltos.ordenes > 0 || sueltos.contadores > 0) {
      logger.info('api', 'Analisis sueltos caducados borrados', {
        metadata: sueltos,
      });
    }
  }
);
