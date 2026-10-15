import { createHash } from 'crypto';
import { FieldValue, type QuerySnapshot } from 'firebase-admin/firestore';
import type { Analysis, Comparison, Contract } from '@clausum/shared';
import { COLLECTIONS, USER_SUBCOLLECTIONS } from '@clausum/shared';
import { adminAuth, adminDb, adminStorage } from '../firebase/admin';
import { cancelWompiSubscription } from './wompi.service';
import { cancelPayPalSubscription } from './paypal.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────
// Supresión de cuenta — Ley 1581 de 2012 (habeas data)
//
// El orden importa más que el código:
//
// 1. CANCELAR LA SUSCRIPCIÓN PRIMERO. Si se borra el usuario antes, el
//    cobro recurrente sigue vivo en Wompi o PayPal y la plataforma acaba
//    cobrando a una cuenta que ya no existe, sin forma de que el afectado
//    lo reclame desde la app. Es el error más caro de esta función.
//
// 2. Borrar los datos del usuario y sus archivos.
//
// 3. CONSERVAR `payments`, anonimizado. La normativa tributaria colombiana
//    obliga a retener soportes de facturación; no se pueden borrar aunque
//    el titular lo pida. Se rompe el vínculo con la persona sustituyendo
//    `userId` por un hash, de forma que el registro contable sobrevive sin
//    seguir siendo un dato personal.
//
// 4. Borrar el usuario de Authentication al final: mientras exista, el
//    token sigue siendo válido y un borrado a medias es recuperable. Si se
//    borra primero y algo falla después, quedan datos huérfanos que nadie
//    puede reclamar.
// ─────────────────────────────────────────────────────────────────────────

/** Ventana de reautenticación para operaciones destructivas. */
const REAUTH_MAX_AGE_SECONDS = 5 * 60;

/**
 * Exige que el usuario se haya autenticado hace poco.
 *
 * `auth_time` es el momento del login real, no del refresco del token: un
 * token renovado automáticamente no sirve para borrar una cuenta.
 */
export function assertRecentAuth(authTime: number | undefined): void {
  if (!authTime) {
    throw new AppError(
      'No se pudo verificar tu identidad. Vuelve a iniciar sesión.',
      401,
      'REAUTH_REQUIRED'
    );
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - authTime;
  if (ageSeconds > REAUTH_MAX_AGE_SECONDS) {
    throw new AppError(
      'Por seguridad, vuelve a introducir tu contraseña antes de eliminar la cuenta.',
      401,
      'REAUTH_REQUIRED'
    );
  }
}

/**
 * Hash estable del uid, para conservar trazabilidad contable (saber que dos
 * pagos fueron del mismo titular) sin guardar a quién corresponden.
 */
function anonymizeUid(userId: string): string {
  return createHash('sha256').update(`clausum:deleted:${userId}`).digest('hex').slice(0, 32);
}

async function cancelActiveSubscription(userId: string): Promise<string | null> {
  const doc = await adminDb().collection(COLLECTIONS.users).doc(userId).get();
  if (!doc.exists) return null;

  const provider = doc.get('billingProvider') as 'wompi' | 'paypal' | undefined;
  const status = doc.get('subscriptionStatus') as string | undefined;

  // Sin proveedor no hay nada que cancelar. Un estado ya cancelado tampoco
  // necesita otra llamada, pero conviene intentarlo si hay fuente de pago
  // activa, porque el estado local puede estar desincronizado.
  if (!provider) return null;
  if (status === 'canceled' && !doc.get('wompiPaymentSourceId')) return null;

  try {
    if (provider === 'wompi') {
      await cancelWompiSubscription(userId);
    } else {
      await cancelPayPalSubscription(userId);
    }
    logger.info('api', 'Suscripción cancelada antes de borrar la cuenta', {
      userId,
      metadata: { provider },
    });
    return null;
  } catch (error) {
    // No se aborta el borrado: el derecho de supresión no puede quedar
    // bloqueado por un fallo de la pasarela. Pero se devuelve el aviso para
    // que quede registrado y alguien lo revise a mano.
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('api', 'No se pudo cancelar la suscripción al borrar la cuenta', error, {
      userId,
      metadata: { provider },
    });
    return `No se pudo cancelar la suscripción en ${provider}: ${reason}`;
  }
}

/** Borra todos los documentos de una colección que pertenezcan al usuario. */
async function deleteOwnedDocs(collection: string, userId: string): Promise<number> {
  const snapshot = await adminDb()
    .collection(collection)
    .where('userId', '==', userId)
    .get();

  if (snapshot.empty) return 0;

  // BulkWriter maneja el reparto y los reintentos; un batch normal se queda
  // en 500 operaciones y un usuario intenso las pasa.
  const writer = adminDb().bulkWriter();
  for (const doc of snapshot.docs) {
    void writer.delete(doc.ref);
  }
  await writer.close();

  return snapshot.size;
}

/** Borra una subcolección completa del usuario. */
async function deleteSubcollection(userId: string, name: string): Promise<number> {
  const snapshot = await adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(name)
    .get();

  if (snapshot.empty) return 0;

  const writer = adminDb().bulkWriter();
  for (const doc of snapshot.docs) {
    void writer.delete(doc.ref);
  }
  await writer.close();

  return snapshot.size;
}

/**
 * Anonimiza los pagos en lugar de borrarlos: la retención de soportes de
 * facturación es una obligación tributaria que prevalece sobre la
 * supresión, pero el registro deja de ser un dato personal.
 */
async function anonymizePayments(userId: string): Promise<number> {
  const snapshot = await adminDb()
    .collection(COLLECTIONS.payments)
    .where('userId', '==', userId)
    .get();

  if (snapshot.empty) return 0;

  const anonUid = anonymizeUid(userId);
  const writer = adminDb().bulkWriter();
  for (const doc of snapshot.docs) {
    void writer.update(doc.ref, {
      userId: anonUid,
      anonymizedAt: FieldValue.serverTimestamp(),
    });
  }
  await writer.close();

  return snapshot.size;
}

async function deleteUserFiles(userId: string): Promise<void> {
  const bucket = adminStorage().bucket();
  // Cubre contracts/, exports/ y profile/ de una vez.
  await bucket.deleteFiles({ prefix: `users/${userId}/`, force: true });
}

export interface DeleteAccountResult {
  /** Documentos eliminados por colección. */
  counts: {
    contracts: number;
    analyses: number;
    comparisons: number;
    alerts: number;
    usage: number;
    settings: number;
    history: number;
  };
  paymentsAnonymized: number;
  warnings: string[];
}

export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  const warnings: string[] = [];

  // ── 1. La pasarela primero ──────────────────────────────────────────
  const cancelWarning = await cancelActiveSubscription(userId);
  if (cancelWarning) warnings.push(cancelWarning);

  // ── 2. Datos y archivos ─────────────────────────────────────────────
  const [contracts, analyses, comparisons, alerts] = await Promise.all([
    deleteOwnedDocs(COLLECTIONS.contracts, userId),
    deleteOwnedDocs(COLLECTIONS.analyses, userId),
    deleteOwnedDocs(COLLECTIONS.comparisons, userId),
    deleteOwnedDocs(COLLECTIONS.alerts, userId),
  ]);

  const [usage, settings, history] = await Promise.all([
    deleteSubcollection(userId, USER_SUBCOLLECTIONS.usage),
    deleteSubcollection(userId, USER_SUBCOLLECTIONS.settings),
    deleteSubcollection(userId, USER_SUBCOLLECTIONS.history),
  ]);

  await deleteOwnedDocs(COLLECTIONS.subscriptions, userId);

  try {
    await deleteUserFiles(userId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    warnings.push(`Quedaron archivos sin borrar en Storage: ${reason}`);
    logger.error('api', 'Fallo al borrar archivos del usuario', error, { userId });
  }

  // ── 3. Pagos: anonimizar, no borrar ─────────────────────────────────
  const paymentsAnonymized = await anonymizePayments(userId);

  // ── 4. El usuario, al final ─────────────────────────────────────────
  await adminDb().collection(COLLECTIONS.users).doc(userId).delete();

  // Queda constancia de la supresión para poder demostrarla ante una
  // reclamación. No incluye datos personales, solo el hash.
  await adminDb().collection(COLLECTIONS.systemLogs).add({
    level: 'info',
    service: 'api',
    message: 'Cuenta eliminada a petición del titular',
    metadata: {
      anonUid: anonymizeUid(userId),
      contracts,
      analyses,
      comparisons,
      alerts,
      paymentsAnonymized,
      warnings: warnings.length,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  try {
    await adminAuth().deleteUser(userId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    warnings.push(`El usuario de Authentication no se pudo borrar: ${reason}`);
    logger.error('api', 'Fallo al borrar el usuario de Auth', error, { userId });
  }

  logger.info('api', 'Supresión de cuenta completada', {
    metadata: {
      anonUid: anonymizeUid(userId),
      contracts,
      analyses,
      comparisons,
      alerts,
      paymentsAnonymized,
    },
  });

  return {
    counts: { contracts, analyses, comparisons, alerts, usage, settings, history },
    paymentsAnonymized,
    warnings,
  };
}

export interface AccountExport {
  exportedAt: string;
  profile: Record<string, unknown>;
  contracts: Array<Contract & { id: string }>;
  analyses: Array<Analysis & { id: string }>;
  comparisons: Array<Comparison & { id: string }>;
  history: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
}

/**
 * Portabilidad de datos: devuelve todo lo que la plataforma guarda del
 * usuario, en JSON. Los contratos originales no van aquí — son archivos y
 * el usuario ya los puede descargar uno a uno desde el historial.
 */
export async function exportAccountData(userId: string): Promise<AccountExport> {
  const db = adminDb();

  const [userDoc, contractsSnap, analysesSnap, comparisonsSnap, historySnap, paymentsSnap] =
    await Promise.all([
      db.collection(COLLECTIONS.users).doc(userId).get(),
      db.collection(COLLECTIONS.contracts).where('userId', '==', userId).get(),
      db.collection(COLLECTIONS.analyses).where('userId', '==', userId).get(),
      db.collection(COLLECTIONS.comparisons).where('userId', '==', userId).get(),
      db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.history)
        .get(),
      db.collection(COLLECTIONS.payments).where('userId', '==', userId).get(),
    ]);

  if (!userDoc.exists) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  const mapDocs = <T>(snap: QuerySnapshot): T[] =>
    snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);

  return {
    exportedAt: new Date().toISOString(),
    profile: { uid: userId, ...userDoc.data() },
    contracts: mapDocs<Contract & { id: string }>(contractsSnap),
    analyses: mapDocs<Analysis & { id: string }>(analysesSnap),
    comparisons: mapDocs<Comparison & { id: string }>(comparisonsSnap),
    history: mapDocs<Record<string, unknown>>(historySnap),
    payments: mapDocs<Record<string, unknown>>(paymentsSnap),
  };
}
