import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { COLLECTIONS, FREE_ENTITLEMENTS, USER_SUBCOLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { invalidatePlanCache } from '../config/plans';
import {
  releaseAnalysisUsage,
  releaseComparisonUsage,
  reserveAnalysisUsage,
  reserveComparisonUsage,
} from '../services/subscription.service';

// ─────────────────────────────────────────────────────────────────────────
// La cuota es lo que separa una cuenta sin pagar de una suscripción. Si la
// reserva no es atómica, dos análisis lanzados a la vez por alguien con un
// crédito restante pasan los dos, y el plan deja de significar nada — en
// silencio, porque cada petición individual parece correcta.
//
// El archivo está partido en dos a propósito:
//
//  - POLÍTICA: qué puede hacer una cuenta sin suscripción. Hoy, nada: para
//    probar el producto está el pago por documento, que no pide cuenta.
//  - MECANISMO: que contar y reservar funcione, con un límite puesto a mano.
//    Separarlo importa porque la política cambia con el negocio y el
//    mecanismo no: si fueran lo mismo, bajar el plan a cero habría dejado
//    sin probar la atomicidad, que es lo que de verdad protege el dinero.
//
// Necesita los emuladores: `pnpm test:emulators`.
// ─────────────────────────────────────────────────────────────────────────

const UID = 'quota-test-user';
/** Pequeño a propósito: cada reserva es una transacción contra el emulador. */
const LIMITE = 3;

function periodoActual(): string {
  const ahora = new Date();
  return `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, '0')}`;
}

function usageRef() {
  return adminDb()
    .collection(COLLECTIONS.users)
    .doc(UID)
    .collection(USER_SUBCOLLECTIONS.usage)
    .doc(periodoActual());
}

function planRef() {
  return adminDb().collection(COLLECTIONS.plans).doc('free');
}

async function contador(campo: 'analysesCount' | 'comparisonsCount'): Promise<number> {
  const snap = await usageRef().get();
  return (snap.data()?.[campo] as number) ?? 0;
}

/**
 * Pone límites al plan Free escribiéndolos en Firestore.
 *
 * No es un atajo de pruebas: es exactamente como se cambian los límites en
 * producción desde administración. `getPlanEntitlements` hace
 * `{ ...defaults, ...plan.limits }`, así que el documento gana campo por
 * campo sobre la constante compartida.
 *
 * Hay que invalidar el caché: sin eso el cambio tarda hasta 60 segundos en
 * verse y la prueba leería los límites de antes.
 */
async function fijarLimites(analyses: number, comparisons: number): Promise<void> {
  await planRef().set({
    name: 'Free',
    slug: 'free',
    priceMonthly: 0,
    currency: 'COP',
    limits: {
      ...FREE_ENTITLEMENTS,
      analysesPerMonth: analyses,
      comparisonsPerMonth: comparisons,
    },
    features: [],
    active: true,
    sortOrder: 0,
  });
  invalidatePlanCache('free');
}

async function quitarPlanDeFirestore(): Promise<void> {
  await planRef().delete();
  invalidatePlanCache('free');
}

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Estas pruebas tocan Firestore: correr con pnpm test:emulators');
  }
});

beforeEach(async () => {
  await adminDb().collection(COLLECTIONS.users).doc(UID).set({
    email: 'quota@ejemplo.com',
    planId: 'free',
  });
  await usageRef().delete();
  // Sin documento de plan: manda la constante compartida.
  await quitarPlanDeFirestore();
});

afterEach(async () => {
  await usageRef().delete();
  await adminDb().collection(COLLECTIONS.users).doc(UID).delete();
  // Importante dejarlo limpio: el documento del plan es global, no del
  // usuario de prueba, y las pruebas corren en serie sobre el mismo emulador.
  await quitarPlanDeFirestore();
});

describe('una cuenta sin suscripción', () => {
  it('no incluye ningún análisis', async () => {
    expect(FREE_ENTITLEMENTS.analysesPerMonth).toBe(0);

    await expect(reserveAnalysisUsage(UID)).rejects.toMatchObject({
      code: 'QUOTA_ANALYSES_EXCEEDED',
      statusCode: 403,
    });
    expect(await contador('analysesCount')).toBe(0);
  });

  it('no incluye ninguna comparación', async () => {
    expect(FREE_ENTITLEMENTS.comparisonsPerMonth).toBe(0);

    await expect(reserveComparisonUsage(UID)).rejects.toMatchObject({
      code: 'QUOTA_COMPARISONS_EXCEEDED',
    });
  });

  it('el mensaje no dice "límite alcanzado", que sonaría a fallo nuestro', async () => {
    // Con cero no hay límite alcanzado: hay un plan que no incluye análisis.
    // Y hay DOS salidas, no una, así que el mensaje nombra la barata.
    const error = await reserveAnalysisUsage(UID).catch((e: unknown) => e);
    const mensaje = (error as { message: string }).message;

    expect(mensaje).not.toContain('Límite mensual alcanzado');
    expect(mensaje).toContain('pagar solo este documento');
  });
});

describe('el plan de Firestore manda sobre la constante', () => {
  it('un límite guardado en Firestore permite análisis que la constante no', async () => {
    // Es la trampa que hay que tener presente al cambiar FREE_ENTITLEMENTS:
    // tocar la constante NO cambia producción mientras el documento del plan
    // diga otra cosa.
    await fijarLimites(2, 0);

    await expect(reserveAnalysisUsage(UID)).resolves.toBeUndefined();
    expect(await contador('analysesCount')).toBe(1);
  });
});

describe('la reserva es atómica', () => {
  beforeEach(() => fijarLimites(LIMITE, 1));

  it('permite exactamente el número de análisis del plan', async () => {
    for (let i = 0; i < LIMITE; i += 1) {
      await reserveAnalysisUsage(UID);
    }
    expect(await contador('analysesCount')).toBe(LIMITE);
  });

  it('rechaza el siguiente con QUOTA_ANALYSES_EXCEEDED', async () => {
    for (let i = 0; i < LIMITE; i += 1) {
      await reserveAnalysisUsage(UID);
    }

    await expect(reserveAnalysisUsage(UID)).rejects.toMatchObject({
      code: 'QUOTA_ANALYSES_EXCEEDED',
      statusCode: 403,
    });

    // Un rechazo no debe incrementar el contador.
    expect(await contador('analysesCount')).toBe(LIMITE);
  });

  it('no deja pasar dos reservas simultáneas con un solo crédito libre', async () => {
    // El caso que motiva la transacción: se consume la cuota hasta dejar
    // uno, y se piden dos a la vez. Exactamente una debe pasar.
    for (let i = 0; i < LIMITE - 1; i += 1) {
      await reserveAnalysisUsage(UID);
    }

    const resultados = await Promise.allSettled([
      reserveAnalysisUsage(UID),
      reserveAnalysisUsage(UID),
    ]);

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(await contador('analysesCount')).toBe(LIMITE);
  });

  it('con la cuota agotada, diez peticiones simultáneas fallan todas', async () => {
    for (let i = 0; i < LIMITE; i += 1) {
      await reserveAnalysisUsage(UID);
    }

    const resultados = await Promise.allSettled(
      Array.from({ length: 10 }, () => reserveAnalysisUsage(UID))
    );

    expect(resultados.every((r) => r.status === 'rejected')).toBe(true);
    expect(await contador('analysesCount')).toBe(LIMITE);
  });

  it('la liberación devuelve el crédito tras un fallo de la IA', async () => {
    await reserveAnalysisUsage(UID);
    expect(await contador('analysesCount')).toBe(1);

    await releaseAnalysisUsage(UID);
    expect(await contador('analysesCount')).toBe(0);
  });

  it('la liberación nunca deja el contador en negativo', async () => {
    // Un rollback de más no debe regalar créditos.
    await releaseAnalysisUsage(UID);
    await releaseAnalysisUsage(UID);
    expect(await contador('analysesCount')).toBe(0);
  });

  it('reservar y liberar en paralelo deja el contador consistente', async () => {
    await reserveAnalysisUsage(UID);
    await reserveAnalysisUsage(UID);

    await Promise.all([releaseAnalysisUsage(UID), releaseAnalysisUsage(UID)]);

    expect(await contador('analysesCount')).toBe(0);
  });

  it('las cuotas de análisis y comparación son independientes', async () => {
    await reserveComparisonUsage(UID);

    // Agotar comparaciones no debe consumir análisis.
    expect(await contador('analysesCount')).toBe(0);
    await expect(reserveAnalysisUsage(UID)).resolves.toBeUndefined();
  });

  it('una comparación de más se rechaza, y liberarla la devuelve', async () => {
    await reserveComparisonUsage(UID);
    await expect(reserveComparisonUsage(UID)).rejects.toMatchObject({
      code: 'QUOTA_COMPARISONS_EXCEEDED',
    });

    await releaseComparisonUsage(UID);
    expect(await contador('comparisonsCount')).toBe(0);
    await expect(reserveComparisonUsage(UID)).resolves.toBeUndefined();
  });
});
