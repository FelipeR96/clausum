import type {
  EntitlementAction,
  PlanSlug,
  SubscriptionSummary,
  UsageSummary,
  User,
} from '@clausum/shared';
import { COLLECTIONS, PRO_ENTITLEMENTS, USER_SUBCOLLECTIONS } from '@clausum/shared';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth } from '../firebase/admin';
import { adminDb } from '../firebase/admin';
import { getPlanBySlug, getPlanEntitlements, isUnlimited } from '../config/plans';
import { firestoreDateToIso } from '../utils/firestore-date';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function getUserRecord(userId: string): Promise<Partial<User>> {
  const doc = await adminDb().collection(COLLECTIONS.users).doc(userId).get();
  return (doc.data() as Partial<User>) ?? {};
}

/**
 * Plan efectivo: Pro solo aplica con suscripción explícitamente activa/trialing.
 * El frontend no puede influir en esto.
 */
export async function resolveEffectivePlanId(userId: string): Promise<PlanSlug> {
  const user = await getUserRecord(userId);
  const planId = (user.planId as PlanSlug) ?? 'free';

  if (planId !== 'pro') {
    return 'free';
  }

  const status = user.subscriptionStatus;
  const periodEndDate = user.currentPeriodEnd
    ? user.currentPeriodEnd instanceof Date
      ? user.currentPeriodEnd
      : user.currentPeriodEnd instanceof Timestamp
        ? user.currentPeriodEnd.toDate()
        : new Date(user.currentPeriodEnd.seconds * 1000)
    : null;
  const periodStillValid = periodEndDate ? periodEndDate.getTime() > Date.now() : false;

  const statusAllowsPro =
    status &&
    (ACTIVE_SUBSCRIPTION_STATUSES.has(status) ||
      (status === 'canceled' && user.cancelAtPeriodEnd && periodStillValid));

  if (!statusAllowsPro) {
    logger.warn('api', 'Plan Pro inactivo, aplicando límites free', {
      userId,
      metadata: { subscriptionStatus: status ?? 'missing' },
    });
    return 'free';
  }

  if (user.currentPeriodEnd) {
    const end =
      user.currentPeriodEnd instanceof Date
        ? user.currentPeriodEnd
        : user.currentPeriodEnd instanceof Timestamp
          ? user.currentPeriodEnd.toDate()
          : new Date(user.currentPeriodEnd.seconds * 1000);

    if (end.getTime() < Date.now()) {
      logger.warn('api', 'Suscripción Pro vencida, aplicando límites free', {
        userId,
        metadata: { currentPeriodEnd: end.toISOString() },
      });
      return 'free';
    }
  }

  return 'pro';
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const planId = await resolveEffectivePlanId(userId);
  const entitlements = await getPlanEntitlements(planId);
  const period = currentPeriod();

  const usageDoc = await adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(USER_SUBCOLLECTIONS.usage)
    .doc(period)
    .get();

  const analysesCount = (usageDoc.data()?.analysesCount as number) ?? 0;
  const comparisonsCount = (usageDoc.data()?.comparisonsCount as number) ?? 0;

  const analysesLimit = entitlements.analysesPerMonth;
  const comparisonsLimit = entitlements.comparisonsPerMonth;

  return {
    period,
    analysesCount,
    comparisonsCount,
    analysesLimit,
    comparisonsLimit,
    analysesRemaining: isUnlimited(analysesLimit)
      ? null
      : Math.max(0, analysesLimit - analysesCount),
    comparisonsRemaining: isUnlimited(comparisonsLimit)
      ? null
      : Math.max(0, comparisonsLimit - comparisonsCount),
  };
}

export async function getSubscriptionSummary(
  userId: string
): Promise<SubscriptionSummary> {
  const planId = await resolveEffectivePlanId(userId);
  const plan = await getPlanBySlug(planId);
  const user = await getUserRecord(userId);
  const usage = await getUsageSummary(userId);

  return {
    planId,
    planName: plan?.name ?? (planId === 'pro' ? 'Pro' : 'Free'),
    entitlements: await getPlanEntitlements(planId),
    usage,
    subscriptionStatus: user.subscriptionStatus,
    currentPeriodEnd: firestoreDateToIso(user.currentPeriodEnd),
    billingProvider: user.billingProvider,
    billingInterval: user.billingInterval,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
  };
}

/**
 * Validación central de permisos por plan.
 * Todas las rutas sensibles deben pasar por aquí.
 */
export async function assertEntitlement(
  userId: string,
  action: EntitlementAction
): Promise<void> {
  const planId = await resolveEffectivePlanId(userId);
  const entitlements = await getPlanEntitlements(planId);
  const usage = await getUsageSummary(userId);

  switch (action) {
    case 'analysis.run': {
      if (isUnlimited(entitlements.analysesPerMonth)) return;
      if (usage.analysesCount >= entitlements.analysesPerMonth) {
        const hint =
          planId === 'pro'
            ? 'Has alcanzado el límite mensual de tu plan Pro.'
            : 'Actualiza a Pro para obtener hasta 75 análisis al mes.';
        throw new AppError(
          `Límite mensual alcanzado (${entitlements.analysesPerMonth} análisis). ${hint}`,
          403,
          'QUOTA_ANALYSES_EXCEEDED'
        );
      }
      return;
    }
    case 'comparison.run': {
      if (isUnlimited(entitlements.comparisonsPerMonth)) return;
      if (usage.comparisonsCount >= entitlements.comparisonsPerMonth) {
        const hint =
          planId === 'pro'
            ? 'Has alcanzado el límite mensual de tu plan Pro.'
            : `Actualiza a Pro para obtener hasta ${PRO_ENTITLEMENTS.comparisonsPerMonth} comparaciones al mes.`;
        throw new AppError(
          `Límite mensual de comparaciones alcanzado (${entitlements.comparisonsPerMonth}). ${hint}`,
          403,
          'QUOTA_COMPARISONS_EXCEEDED'
        );
      }
      return;
    }
    case 'export.pdf': {
      if (!entitlements.exportPdf) {
        throw new AppError(
          'La exportación PDF requiere plan Pro.',
          403,
          'FEATURE_PRO_REQUIRED'
        );
      }
      return;
    }
    case 'history.full': {
      if (!entitlements.fullHistory) {
        throw new AppError(
          'El historial completo requiere plan Pro.',
          403,
          'FEATURE_PRO_REQUIRED'
        );
      }
      return;
    }
    case 'alerts.advanced': {
      if (!entitlements.alertsAdvanced) {
        throw new AppError(
          'Las alertas avanzadas requieren plan Pro.',
          403,
          'FEATURE_PRO_REQUIRED'
        );
      }
      return;
    }
    default:
      throw new AppError('Acción de plan no reconocida', 500, 'INVALID_ENTITLEMENT');
  }
}

export async function incrementAnalysisUsage(userId: string): Promise<void> {
  const period = currentPeriod();
  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(USER_SUBCOLLECTIONS.usage)
    .doc(period)
    .set(
      {
        period,
        analysesCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

export async function incrementComparisonUsage(userId: string): Promise<void> {
  const period = currentPeriod();
  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(USER_SUBCOLLECTIONS.usage)
    .doc(period)
    .set(
      {
        period,
        comparisonsCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

async function reserveMonthlyUsage(
  userId: string,
  counterField: 'analysesCount' | 'comparisonsCount',
  limit: number,
  exceeded: { message: string; code: string }
): Promise<void> {
  if (isUnlimited(limit)) return;

  const period = currentPeriod();
  const usageRef = adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(USER_SUBCOLLECTIONS.usage)
    .doc(period);

  await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const current = (snapshot.data()?.[counterField] as number) ?? 0;

    if (current >= limit) {
      throw new AppError(exceeded.message, 403, exceeded.code);
    }

    transaction.set(
      usageRef,
      {
        period,
        [counterField]: current + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

async function releaseMonthlyUsage(
  userId: string,
  counterField: 'analysesCount' | 'comparisonsCount'
): Promise<void> {
  const period = currentPeriod();
  const usageRef = adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(USER_SUBCOLLECTIONS.usage)
    .doc(period);

  await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const current = (snapshot.data()?.[counterField] as number) ?? 0;

    transaction.set(
      usageRef,
      {
        period,
        [counterField]: Math.max(0, current - 1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function reserveAnalysisUsage(userId: string): Promise<void> {
  const planId = await resolveEffectivePlanId(userId);
  const entitlements = await getPlanEntitlements(planId);
  const upgradeHint =
    planId === 'pro'
      ? 'Has alcanzado el límite mensual de tu plan Pro.'
      : 'Actualiza a Pro para obtener hasta 75 análisis al mes.';

  await reserveMonthlyUsage(
    userId,
    'analysesCount',
    entitlements.analysesPerMonth,
    {
      message: `Límite mensual alcanzado (${entitlements.analysesPerMonth} análisis). ${upgradeHint}`,
      code: 'QUOTA_ANALYSES_EXCEEDED',
    }
  );
}

export async function reserveComparisonUsage(userId: string): Promise<void> {
  const planId = await resolveEffectivePlanId(userId);
  const entitlements = await getPlanEntitlements(planId);
  const upgradeHint =
    planId === 'pro'
      ? 'Has alcanzado el límite mensual de tu plan Pro.'
      : `Actualiza a Pro para obtener hasta ${PRO_ENTITLEMENTS.comparisonsPerMonth} comparaciones al mes.`;

  await reserveMonthlyUsage(
    userId,
    'comparisonsCount',
    entitlements.comparisonsPerMonth,
    {
      message: `Límite mensual de comparaciones alcanzado (${entitlements.comparisonsPerMonth}). ${upgradeHint}`,
      code: 'QUOTA_COMPARISONS_EXCEEDED',
    }
  );
}

export async function releaseAnalysisUsage(userId: string): Promise<void> {
  await releaseMonthlyUsage(userId, 'analysesCount');
}

export async function releaseComparisonUsage(userId: string): Promise<void> {
  await releaseMonthlyUsage(userId, 'comparisonsCount');
}

/**
 * Solo el backend puede cambiar el plan (webhooks Wompi/PayPal, admin, emulador de prueba).
 */
export async function setUserPlan(
  userId: string,
  planId: PlanSlug,
  options?: {
    subscriptionId?: string;
    subscriptionStatus?: string;
    currentPeriodEnd?: Date;
    billingProvider?: 'wompi' | 'paypal';
    billingInterval?: 'monthly' | 'annual';
    wompiPaymentSourceId?: number | null;
    wompiBillingInterval?: 'monthly' | 'annual' | null;
    cancelAtPeriodEnd?: boolean;
    clearCancellation?: boolean;
    /**
     * Monto al que se suscribio, en centavos. Lo lee la renovacion para
     * cobrar siempre lo mismo aunque el precio de la plataforma cambie.
     * `null` lo borra, al cancelar.
     */
    subscriptionAmountInCents?: number | null;
  }
): Promise<void> {
  const update: Record<string, unknown> = {
    planId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (options?.subscriptionId !== undefined) {
    update.subscriptionId = options.subscriptionId;
  }
  if (options?.subscriptionStatus !== undefined) {
    update.subscriptionStatus = options.subscriptionStatus;
  }
  if (options?.currentPeriodEnd !== undefined) {
    update.currentPeriodEnd = Timestamp.fromDate(options.currentPeriodEnd);
  }
  if (options?.billingProvider !== undefined) {
    update.billingProvider = options.billingProvider;
  }
  if (options?.billingInterval !== undefined) {
    update.billingInterval = options.billingInterval;
  }
  if (options?.subscriptionAmountInCents !== undefined) {
    if (options.subscriptionAmountInCents === null) {
      update.subscriptionAmountInCents = FieldValue.delete();
    } else {
      update.subscriptionAmountInCents = options.subscriptionAmountInCents;
    }
  }
  if (options?.wompiPaymentSourceId !== undefined) {
    if (options.wompiPaymentSourceId === null) {
      update.wompiPaymentSourceId = FieldValue.delete();
    } else {
      update.wompiPaymentSourceId = options.wompiPaymentSourceId;
    }
  }
  if (options?.wompiBillingInterval !== undefined) {
    if (options.wompiBillingInterval === null) {
      update.wompiBillingInterval = FieldValue.delete();
    } else {
      update.wompiBillingInterval = options.wompiBillingInterval;
    }
  }
  if (options?.cancelAtPeriodEnd !== undefined) {
    update.cancelAtPeriodEnd = options.cancelAtPeriodEnd;
    if (options.cancelAtPeriodEnd) {
      update.canceledAt = FieldValue.serverTimestamp();
    }
  }
  if (options?.clearCancellation) {
    update.cancelAtPeriodEnd = false;
    update.canceledAt = FieldValue.delete();
  }

  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .set(update, { merge: true });

  // setCustomUserClaims REEMPLAZA el objeto entero, no fusiona. Escribir
  // solo { planId } borraba cualquier otro claim del usuario — en
  // particular `admin`, que se perdia en cuanto esa persona pagaba, se le
  // renovaba la suscripcion o se le cambiaba el plan desde el panel. El
  // sintoma llegaba separado de la causa: el menu de administracion seguia
  // dibujandose (el frontend lee un token cacheado) y la API respondia 404
  // a todo.
  const actuales = (await adminAuth().getUser(userId)).customClaims ?? {};
  await adminAuth().setCustomUserClaims(userId, { ...actuales, planId });

  logger.info('api', 'Plan de usuario actualizado', {
    userId,
    metadata: {
      planId,
      ...(options?.subscriptionStatus
        ? { subscriptionStatus: options.subscriptionStatus }
        : {}),
    },
  });
}
