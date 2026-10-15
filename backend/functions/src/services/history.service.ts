import { COLLECTIONS, USER_SUBCOLLECTIONS } from '@clausum/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase/admin';
import {
  assertEntitlement,
  getSubscriptionSummary,
} from './subscription.service';
import { ENTITLEMENT_ACTIONS } from '@clausum/shared';
import { isUnlimited } from '../config/plans';
import { logger } from '../utils/logger';

const FIRESTORE_BATCH_LIMIT = 400;

/**
 * Elimina entradas de historial más antiguas que el tope del plan (p. ej. Free = 10).
 * Conserva las más recientes por `createdAt` descendente.
 */
export async function purgeFreeUserHistory(
  userId: string,
  maxEntries: number
): Promise<number> {
  if (isUnlimited(maxEntries) || maxEntries <= 0) {
    return 0;
  }

  const col = adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(USER_SUBCOLLECTIONS.history);

  const snapshot = await col.orderBy('createdAt', 'desc').get();
  if (snapshot.size <= maxEntries) {
    return 0;
  }

  const toDelete = snapshot.docs.slice(maxEntries);
  let deleted = 0;

  for (let i = 0; i < toDelete.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = toDelete.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = adminDb().batch();
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deleted += chunk.length;
  }

  if (deleted > 0) {
    logger.info('api', 'Historial Free purgado', {
      userId,
      metadata: { deleted, maxEntries },
    });
  }

  return deleted;
}

async function maybePurgeFreeHistory(userId: string): Promise<void> {
  const summary = await getSubscriptionSummary(userId);
  const { fullHistory, historyMaxEntries } = summary.entitlements;

  if (fullHistory || isUnlimited(historyMaxEntries)) {
    return;
  }

  await purgeFreeUserHistory(userId, historyMaxEntries);
}

export async function addHistoryEntry(
  userId: string,
  entry: {
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, string | number | boolean>;
  }
): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(USER_SUBCOLLECTIONS.history)
    .add({
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
    });

  await maybePurgeFreeHistory(userId);
}

export async function listUserHistory(
  userId: string,
  limit = 20
): Promise<{ entries: Record<string, unknown>[]; limited: boolean }> {
  const summary = await getSubscriptionSummary(userId);
  const maxEntries = summary.entitlements.historyMaxEntries;

  if (!summary.entitlements.fullHistory && !isUnlimited(maxEntries)) {
    await purgeFreeUserHistory(userId, maxEntries);
  }

  let query = adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(USER_SUBCOLLECTIONS.history)
    .orderBy('createdAt', 'desc');

  if (!summary.entitlements.fullHistory) {
    const capped = isUnlimited(maxEntries) ? limit : Math.min(limit, maxEntries);
    query = query.limit(capped);
  } else {
    await assertEntitlement(userId, ENTITLEMENT_ACTIONS.HISTORY_FULL);
    query = query.limit(limit);
  }

  const snapshot = await query.get();
  const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    entries,
    limited: !summary.entitlements.fullHistory,
  };
}
