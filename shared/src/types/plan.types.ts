import type { FirestoreDate } from './common.types';

/** Slugs conocidos. Para añadir un plan nuevo: extender aquí + seed en Firestore. */
export type KnownPlanSlug = 'free' | 'pro';

/** Permite futuros planes sin romper tipos existentes. */
export type PlanSlug = KnownPlanSlug | (string & {});

/**
 * Fuente de verdad de lo que cada plan permite.
 * -1 en contadores numéricos = ilimitado.
 */
export interface PlanEntitlements {
  analysesPerMonth: number;
  comparisonsPerMonth: number;
  maxFileSizeMb: number;
  maxContracts: number;
  exportPdf: boolean;
  fullHistory: boolean;
  historyMaxEntries: number;
  alertsAdvanced: boolean;
  apiAccess: boolean;
  /** OCR para PDF escaneados (sin texto embebido). */
  ocrScannedPdf: boolean;
}

/** @deprecated Usar PlanEntitlements */
export type PlanLimits = PlanEntitlements;

export interface Plan {
  name: string;
  slug: PlanSlug;
  priceMonthly: number;
  /** Precio anual en centavos de la moneda (pago único). */
  priceYearly?: number;
  currency: string;
  limits: PlanEntitlements;
  features: string[];
  active: boolean;
  sortOrder: number;
  updatedAt?: FirestoreDate;
}

export interface UsageSummary {
  period: string;
  analysesCount: number;
  comparisonsCount: number;
  analysesLimit: number;
  comparisonsLimit: number;
  analysesRemaining: number | null;
  comparisonsRemaining: number | null;
}

export interface SubscriptionSummary {
  planId: PlanSlug;
  planName: string;
  entitlements: PlanEntitlements;
  usage: UsageSummary;
  subscriptionStatus?: string;
  /** Fin del periodo pagado (ISO 8601). */
  currentPeriodEnd?: string;
  billingProvider?: 'wompi' | 'paypal';
  cancelAtPeriodEnd?: boolean;
}
