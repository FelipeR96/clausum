import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { COLLECTIONS, FREE_ENTITLEMENTS, USER_SUBCOLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import {
  releaseAnalysisUsage,
  releaseComparisonUsage,
  reserveAnalysisUsage,
  reserveComparisonUsage,
} from '../services/subscription.service';

// ─────────────────────────────────────────────────────────────────────────
// La cuota es lo que separa el plan Free del Pro. Si la reserva no es
// atómica, dos análisis lanzados a la vez por un usuario con un crédito
// restante pasan los dos, y el plan deja de significar nada — en silencio,
// porque cada petición individual parece correcta.
//
// Necesita los emuladores: correr con `pnpm test` dentro de emulators:exec.
// ─────────────────────────────────────────────────────────────────────────

const UID = 'quota-test-user';

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

async function contador(campo: 'analysesCount' | 'comparisonsCount'): Promise<number> {
  const snap = await usageRef().get();
  return (snap.data()?.[campo] as number) ?? 0;
}

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'Estas pruebas tocan Firestore: correr dentro de firebase emulators:exec'
    );
  }
});

beforeEach(async () => {
  // Usuario Free limpio.
  await adminDb().collection(COLLECTIONS.users).doc(UID).set({
    email: 'quota@ejemplo.com',
    planId: 'free',
  });
  await usageRef().delete();
});

afterEach(async () => {
  await usageRef().delete();
  await adminDb().collection(COLLECTIONS.users).doc(UID).delete();
});

describe('reserva de cuota de análisis', () => {
  it('permite exactamente el número de análisis del plan Free', async () => {
    for (let i = 0; i < FREE_ENTITLEMENTS.analysesPerMonth; i += 1) {
      await reserveAnalysisUsage(UID);
    }
    expect(await contador('analysesCount')).toBe(FREE_ENTITLEMENTS.analysesPerMonth);
  });

  it('rechaza el siguiente con QUOTA_ANALYSES_EXCEEDED', async () => {
    for (let i = 0; i < FREE_ENTITLEMENTS.analysesPerMonth; i += 1) {
      await reserveAnalysisUsage(UID);
    }

    await expect(reserveAnalysisUsage(UID)).rejects.toMatchObject({
      code: 'QUOTA_ANALYSES_EXCEEDED',
      statusCode: 403,
    });

    // Un rechazo no debe incrementar el contador.
    expect(await contador('analysesCount')).toBe(FREE_ENTITLEMENTS.analysesPerMonth);
  });

  it('no deja pasar dos reservas simultáneas con un solo crédito libre', async () => {
    // El caso que motiva la transacción: se consume la cuota hasta dejar
    // uno, y se piden dos a la vez. Exactamente una debe pasar.
    for (let i = 0; i < FREE_ENTITLEMENTS.analysesPerMonth - 1; i += 1) {
      await reserveAnalysisUsage(UID);
    }

    const resultados = await Promise.allSettled([
      reserveAnalysisUsage(UID),
      reserveAnalysisUsage(UID),
    ]);

    const aceptadas = resultados.filter((r) => r.status === 'fulfilled');
    const rechazadas = resultados.filter((r) => r.status === 'rejected');

    expect(aceptadas).toHaveLength(1);
    expect(rechazadas).toHaveLength(1);
    expect(await contador('analysesCount')).toBe(FREE_ENTITLEMENTS.analysesPerMonth);
  });

  it('con la cuota agotada, diez peticiones simultáneas fallan todas', async () => {
    for (let i = 0; i < FREE_ENTITLEMENTS.analysesPerMonth; i += 1) {
      await reserveAnalysisUsage(UID);
    }

    const resultados = await Promise.allSettled(
      Array.from({ length: 10 }, () => reserveAnalysisUsage(UID))
    );

    expect(resultados.every((r) => r.status === 'rejected')).toBe(true);
    expect(await contador('analysesCount')).toBe(FREE_ENTITLEMENTS.analysesPerMonth);
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
});

describe('reserva de cuota de comparaciones', () => {
  it('el plan Free permite una comparación y rechaza la segunda', async () => {
    expect(FREE_ENTITLEMENTS.comparisonsPerMonth).toBe(1);

    await reserveComparisonUsage(UID);
    await expect(reserveComparisonUsage(UID)).rejects.toMatchObject({
      code: 'QUOTA_COMPARISONS_EXCEEDED',
    });
  });

  it('las cuotas de análisis y comparación son independientes', async () => {
    await reserveComparisonUsage(UID);

    // Agotar comparaciones no debe consumir análisis.
    expect(await contador('analysesCount')).toBe(0);
    await expect(reserveAnalysisUsage(UID)).resolves.toBeUndefined();
  });

  it('libera la comparación tras un fallo', async () => {
    await reserveComparisonUsage(UID);
    await releaseComparisonUsage(UID);
    expect(await contador('comparisonsCount')).toBe(0);

    // Y vuelve a estar disponible.
    await expect(reserveComparisonUsage(UID)).resolves.toBeUndefined();
  });
});
