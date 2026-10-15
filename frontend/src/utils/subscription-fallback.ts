import {
  DEFAULT_ENTITLEMENTS,
  SEED_PLANS,
  type SubscriptionSummary,
} from '@clausum/shared';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Límites Free por defecto cuando la API aún no responde (emulador arrancando). */
export function buildFreeSubscriptionFallback(): SubscriptionSummary {
  const entitlements = DEFAULT_ENTITLEMENTS.free;

  return {
    planId: 'free',
    planName: SEED_PLANS.free.name,
    entitlements,
    usage: {
      period: currentPeriod(),
      analysesCount: 0,
      comparisonsCount: 0,
      analysesLimit: entitlements.analysesPerMonth,
      comparisonsLimit: entitlements.comparisonsPerMonth,
      analysesRemaining: entitlements.analysesPerMonth,
      comparisonsRemaining: entitlements.comparisonsPerMonth,
    },
  };
}
