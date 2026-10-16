import type { Plan, PlanEntitlements } from '../types/plan.types';
import { BILLING_CURRENCY, PRO_BILLING } from './billing';
import { OCR_SCANNED_MAX_PAGES } from './document-limits';

/**
 * Valor que usan los limites para decir "sin limite".
 *
 * Es un numero porque PlanEntitlements declara numeros, pero NO es una
 * cantidad: pintarlo tal cual produce cosas como "max. -1 en Free". Toda
 * pantalla que muestre un limite tiene que preguntar por esIlimitado antes.
 */
export const SIN_LIMITE = -1;

export function esIlimitado(limite: number): boolean {
  return limite === SIN_LIMITE;
}

export const FREE_ENTITLEMENTS: PlanEntitlements = {
  analysesPerMonth: 3,
  comparisonsPerMonth: 1,
  maxFileSizeMb: 5,
  maxContracts: 10,
  exportPdf: false,
  fullHistory: false,
  historyMaxEntries: 10,
  alertsAdvanced: false,
  apiAccess: false,
  ocrScannedPdf: false,
};

export const PRO_ENTITLEMENTS: PlanEntitlements = {
  analysesPerMonth: 75,
  comparisonsPerMonth: 30,
  maxFileSizeMb: 10,
  maxContracts: SIN_LIMITE,
  exportPdf: true,
  fullHistory: true,
  historyMaxEntries: SIN_LIMITE,
  alertsAdvanced: true,
  apiAccess: true,
  ocrScannedPdf: true,
};

export const SEED_PLANS: Record<'free' | 'pro', Omit<Plan, 'updatedAt'>> = {
  free: {
    name: 'Free',
    slug: 'free',
    priceMonthly: 0,
    currency: BILLING_CURRENCY,
    limits: FREE_ENTITLEMENTS,
    features: [
      '3 análisis al mes',
      '1 comparación al mes',
      'PDF digital o Word (.docx) sin límite de páginas',
      'Sin OCR para PDF escaneados',
      'Alertas básicas',
      'Historial limitado',
    ],
    active: true,
    sortOrder: 0,
  },
  pro: {
    name: 'Pro',
    slug: 'pro',
    priceMonthly: PRO_BILLING.monthlyAmountInCents,
    priceYearly: PRO_BILLING.yearlyAmountInCents,
    currency: BILLING_CURRENCY,
    limits: PRO_ENTITLEMENTS,
    features: [
      '75 análisis al mes',
      '30 comparaciones al mes',
      'PDF digital o Word (.docx) sin límite de páginas',
      `OCR para PDF escaneados (primeras ${OCR_SCANNED_MAX_PAGES} páginas)`,
      'Alertas avanzadas',
      'Historial completo',
      'Exportación PDF',
    ],
    active: true,
    sortOrder: 1,
  },
};

/** Planes por defecto si Firestore no tiene el documento aún. */
export const DEFAULT_ENTITLEMENTS: Record<'free' | 'pro', PlanEntitlements> = {
  free: FREE_ENTITLEMENTS,
  pro: PRO_ENTITLEMENTS,
};
