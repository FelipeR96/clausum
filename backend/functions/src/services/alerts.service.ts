import { FieldValue } from 'firebase-admin/firestore';
import type { Alert, AlertSeverity } from '@clausum/shared';
import { COLLECTIONS, ENTITLEMENT_ACTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { AppError } from '../utils/errors';
import {
  assertEntitlement,
  resolveEffectivePlanId,
} from './subscription.service';
import { getPlanEntitlements } from '../config/plans';

interface RiskAlertInput {
  level: string;
  title: string;
  description: string;
}

export async function createAlertsForRisks(
  userId: string,
  contractId: string,
  analysisId: string,
  risks: RiskAlertInput[]
): Promise<void> {
  if (!risks.length) return;

  const planId = await resolveEffectivePlanId(userId);
  const entitlements = await getPlanEntitlements(planId);

  const alertsToCreate: Array<{
    type: string;
    severity: AlertSeverity;
    title: string;
    message: string;
  }> = [];

  for (const risk of risks) {
    if (risk.level === 'high') {
      if (entitlements.alertsAdvanced) {
        alertsToCreate.push({
          type: 'risk_high',
          severity: 'critical',
          title: risk.title,
          message: risk.description,
        });
      } else {
        // Free: alerta básica (sin severidad crítica)
        alertsToCreate.push({
          type: 'risk_medium',
          severity: 'warning',
          title: `Riesgo detectado: ${risk.title}`,
          message: `${risk.description} (Actualiza a Pro para alertas avanzadas y detalle completo.)`,
        });
      }
    } else if (risk.level === 'medium') {
      alertsToCreate.push({
        type: 'risk_medium',
        severity: 'warning',
        title: risk.title,
        message: risk.description,
      });
    } else if (entitlements.alertsAdvanced) {
      // Free: no alertas por riesgos bajos; Pro sí
      alertsToCreate.push({
        type: 'risk_medium',
        severity: 'info',
        title: risk.title,
        message: risk.description,
      });
    }
  }

  if (!alertsToCreate.length) return;

  const batch = adminDb().batch();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  for (const alert of alertsToCreate.slice(0, entitlements.alertsAdvanced ? 10 : 3)) {
    const ref = adminDb().collection(COLLECTIONS.alerts).doc();
    batch.set(ref, {
      userId,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      contractId,
      analysisId,
      read: false,
      actionUrl: `/panel/contratos/${contractId}/riesgos`,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function createAnalysisDoneAlert(
  userId: string,
  contractId: string,
  analysisId: string,
  title: string
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await adminDb().collection(COLLECTIONS.alerts).add({
    userId,
    type: 'analysis_done',
    severity: 'info',
    title: 'Análisis completado',
    message: `El análisis de "${title}" está listo.`,
    contractId,
    analysisId,
    read: false,
    actionUrl: `/panel/contratos/${contractId}/resultado`,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** Valida si el usuario puede recibir alertas avanzadas (para endpoints futuros). */
export async function assertAdvancedAlerts(userId: string): Promise<void> {
  await assertEntitlement(userId, ENTITLEMENT_ACTIONS.ALERTS_ADVANCED);
}

export async function listUserAlerts(
  userId: string,
  limit = 20
): Promise<Array<Alert & { id: string }>> {
  const snap = await adminDb()
    .collection(COLLECTIONS.alerts)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(Math.min(limit, 50))
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Alert),
  }));
}

export async function markAlertRead(
  userId: string,
  alertId: string
): Promise<Alert & { id: string }> {
  const ref = adminDb().collection(COLLECTIONS.alerts).doc(alertId);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new AppError('Alerta no encontrada', 404, 'ALERT_NOT_FOUND');
  }
  const data = doc.data() as Alert;
  if (data.userId !== userId) {
    throw new AppError('No tienes acceso a esta alerta', 403, 'FORBIDDEN');
  }

  await ref.update({
    read: true,
    readAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return { id: updated.id, ...(updated.data() as Alert) };
}

export async function markAllAlertsRead(userId: string): Promise<number> {
  const snap = await adminDb()
    .collection(COLLECTIONS.alerts)
    .where('userId', '==', userId)
    .where('read', '==', false)
    .limit(50)
    .get();

  if (snap.empty) return 0;

  const batch = adminDb().batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      read: true,
      readAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return snap.size;
}
