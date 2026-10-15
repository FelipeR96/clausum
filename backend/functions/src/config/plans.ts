import type { Plan, PlanEntitlements, PlanSlug } from '@clausum/shared';
import {
  BILLING_CURRENCY,
  COLLECTIONS,
  DEFAULT_ENTITLEMENTS,
  PRO_BILLING,
} from '@clausum/shared';
import { adminDb } from '../firebase/admin';

const planCache = new Map<string, { plan: Plan; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

function normalizeKnownEntitlements(
  slug: PlanSlug,
  entitlements: PlanEntitlements
): PlanEntitlements {
  if (slug !== 'pro') {
    return entitlements;
  }

  const proDefaults = DEFAULT_ENTITLEMENTS.pro;
  return {
    ...entitlements,
    // Datos viejos en Firestore pueden tener Pro ilimitado; el producto actual usa topes.
    analysesPerMonth:
      entitlements.analysesPerMonth < 0
        ? proDefaults.analysesPerMonth
        : entitlements.analysesPerMonth,
    comparisonsPerMonth:
      entitlements.comparisonsPerMonth < 0
        ? proDefaults.comparisonsPerMonth
        : entitlements.comparisonsPerMonth,
  };
}

export async function getPlanBySlug(slug: PlanSlug): Promise<Plan | null> {
  const cached = planCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.plan;
  }

  const doc = await adminDb().collection(COLLECTIONS.plans).doc(slug).get();
  if (!doc.exists) {
    const known = slug as 'free' | 'pro';
    if (known in DEFAULT_ENTITLEMENTS) {
      // Respaldo cuando el documento del plan no está en Firestore (por
      // ejemplo antes de correr el seed). El precio sale de la constante
      // compartida, que es la fuente de verdad del pricing: antes estaba
      // fijado a 2900 EUR, de una versión anterior del producto.
      return {
        name: known === 'pro' ? 'Pro' : 'Free',
        slug: known,
        priceMonthly: known === 'pro' ? PRO_BILLING.monthlyAmountInCents / 100 : 0,
        currency: BILLING_CURRENCY,
        limits: normalizeKnownEntitlements(known, DEFAULT_ENTITLEMENTS[known]),
        features: [],
        active: true,
        sortOrder: known === 'pro' ? 1 : 0,
      };
    }
    return null;
  }

  const plan = doc.data() as Plan;
  planCache.set(slug, { plan, expiresAt: Date.now() + CACHE_TTL_MS });
  return plan;
}

export async function getPlanEntitlements(slug: PlanSlug): Promise<PlanEntitlements> {
  const defaults = DEFAULT_ENTITLEMENTS[slug === 'pro' ? 'pro' : 'free'];
  const plan = await getPlanBySlug(slug);
  if (!plan) {
    return defaults;
  }
  return normalizeKnownEntitlements(slug, { ...defaults, ...plan.limits });
}

export function isUnlimited(limit: number): boolean {
  return limit < 0;
}
