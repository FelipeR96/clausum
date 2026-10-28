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

/**
 * Lo que tiene una cuenta sin suscripcion.
 *
 * Cero analisis y cero comparaciones, y eso cambia lo que ES este plan: ya no
 * es una puerta de entrada --para probar el producto esta el pago por
 * documento, que no pide cuenta-- sino lo que sostiene la cuenta de quien no
 * paga ahora mismo.
 *
 * Los demas limites se quedan a proposito. maxContracts y historyMaxEntries
 * mantienen alcanzable lo que la persona ya tenia: quien estuvo en Pro y lo
 * dejo caer no puede perder el acceso a sus informes anteriores por haber
 * dejado de pagar.
 *
 * OJO: esta constante NO manda en produccion. getPlanEntitlements hace
 * `{ ...defaults, ...plan.limits }`, asi que el documento `plans/free` de
 * Firestore gana campo por campo. Cambiar esto solo afecta a un proyecto
 * recien sembrado o a los campos que falten en ese documento; para que tenga
 * efecto hay que actualizar tambien el plan en Firestore.
 */
export const FREE_ENTITLEMENTS: PlanEntitlements = {
  analysesPerMonth: 0,
  comparisonsPerMonth: 0,
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
  comparisonsPerMonth: 50,
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
      'Acceso a tus análisis anteriores',
      'Sin análisis incluidos: se pagan por documento o con Pro',
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
      `${PRO_ENTITLEMENTS.analysesPerMonth} análisis al mes`,
      `${PRO_ENTITLEMENTS.comparisonsPerMonth} comparaciones al mes`,
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
