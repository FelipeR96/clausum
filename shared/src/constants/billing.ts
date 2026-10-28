/** Moneda de facturación en Colombia. */
export const BILLING_CURRENCY = 'COP' as const;

/** Moneda de facturación LATAM (fuera de Colombia). */
export const BILLING_CURRENCY_LATAM = 'USD' as const;

/** Región de facturación (pricing y pasarela). */
export type BillingRegion = 'CO' | 'LATAM';

/** Precios Pro en centavos COP (Wompi usa amount-in-cents). */
export const PRO_BILLING = {
  currency: BILLING_CURRENCY,
  /** $35.000 COP / mes */
  monthlyAmountInCents: 3_500_000,
  /** $350.000 COP / año (10 meses, 12 de uso) */
  yearlyAmountInCents: 35_000_000,
} as const;

/** Precios Pro en centavos USD (PayPal LATAM). */
export const PRO_BILLING_LATAM = {
  currency: BILLING_CURRENCY_LATAM,
  /** USD 10 / mes */
  monthlyAmountInCents: 1_000,
  /** USD 100 / año (10 meses, 12 de uso) */
  yearlyAmountInCents: 10_000,
} as const;

export type BillingInterval = 'monthly' | 'annual';

/**
 * Compra de un analisis suelto, sin cuenta y sin suscripcion.
 *
 * Existe porque la mayoria de quien necesita revisar un contrato lo
 * necesita UNA vez: quien va a firmar un arriendo o recibe una oferta
 * laboral no se suscribe por meses para resolver algo puntual. La
 * suscripcion asume una necesidad recurrente que ese usuario no tiene.
 *
 * El precio en dolares NO es equivalencia exacta del peso: es un numero
 * redondo cercano (USD 2,99 ~ COP 9.627 al TRM 3.219 del modelo de costos).
 * Si el TRM se mueve mucho, hay que revisarlo a mano.
 *
 * Cuidado con el margen: la comision de pasarela sobre un cobro de este
 * tamano pesa mucho mas, en porcentaje, que sobre una suscripcion.
 */
export const SINGLE_ANALYSIS_BILLING = {
  CO: {
    currency: BILLING_CURRENCY,
    /** $9.550 COP */
    amountInCents: 955_000,
  },
  LATAM: {
    currency: BILLING_CURRENCY_LATAM,
    /** USD 2,99 */
    amountInCents: 299,
  },
} as const;

export function getSingleAnalysisAmount(region: BillingRegion): number {
  return SINGLE_ANALYSIS_BILLING[region].amountInCents;
}

export function formatSingleAnalysisPrice(region: BillingRegion): string {
  return formatProPrice(region, getSingleAnalysisAmount(region));
}

/**
 * Cuantos analisis sueltos cuestan lo mismo que un mes de Pro.
 *
 * Es la escalera del producto: por debajo de ese numero sale mejor pagar
 * suelto, por encima conviene suscribirse. Si algun dia da menos de 2, el
 * pago suelto se esta comiendo la suscripcion.
 */
export function singleAnalysesPerProMonth(region: BillingRegion): number {
  return Math.floor(
    getProAmountForRegion(region, 'monthly') / getSingleAnalysisAmount(region)
  );
}

export function getBillingCurrency(region: BillingRegion): string {
  return region === 'CO' ? BILLING_CURRENCY : BILLING_CURRENCY_LATAM;
}

export function getProAmountForRegion(
  region: BillingRegion,
  interval: BillingInterval
): number {
  const billing = region === 'CO' ? PRO_BILLING : PRO_BILLING_LATAM;
  return interval === 'annual'
    ? billing.yearlyAmountInCents
    : billing.monthlyAmountInCents;
}

/** @deprecated Usar getProAmountForRegion('CO', interval) */
export function getProAmountInCents(interval: BillingInterval): number {
  return getProAmountForRegion('CO', interval);
}

/**
 * Campos del documento de usuario que lo atan a una pasarela de pago.
 *
 * Estan aqui, en un solo sitio, porque hay mas de un lugar que tiene que
 * borrarlos a la vez, y dos listas escritas a mano se separan el dia que se
 * añada un campo nuevo.
 *
 * Y no es solo higiene. El cobro automatico de Wompi busca a quien renovar
 * por `billingProvider` y `wompiPaymentSourceId`. Si estos campos
 * sobreviven a un retiro de plan, una concesion manual de Pro posterior
 * vuelve a cumplir todas las condiciones del programador de renovaciones, y
 * a esa persona le cobran la tarjeta sin haberse vuelto a suscribir.
 */
export const BILLING_GATEWAY_FIELDS = [
  'subscriptionId',
  'billingProvider',
  'billingInterval',
  'subscriptionAmountInCents',
  'wompiPaymentSourceId',
  'wompiBillingInterval',
  'wompiLastRenewalAttemptAt',
] as const;

/**
 * Estado del periodo vigente. Se borran al limpiar un usuario de pruebas,
 * pero NO al retirar un plan: ahi `subscriptionStatus` pasa a 'canceled' a
 * proposito, porque es el registro de que hubo algo y se retiro.
 */
export const BILLING_PERIOD_FIELDS = [
  'subscriptionStatus',
  'currentPeriodEnd',
  'cancelAtPeriodEnd',
  'canceledAt',
] as const;

/** URL del Web Checkout de Wompi. */
export const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';

export function formatCopFromCents(amountInCents: number): string {
  if (amountInCents === 0) return 'Gratis';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: BILLING_CURRENCY,
    minimumFractionDigits: 0,
  }).format(amountInCents / 100);
}

export function formatUsdFromCents(amountInCents: number): string {
  if (amountInCents === 0) return 'Gratis';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: BILLING_CURRENCY_LATAM,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100);
}

/**
 * Formatea por MONEDA y no por region.
 *
 * Hace falta porque una orden guarda su moneda, no la region desde la que se
 * creo: formatear por region obligaria a deducirla de vuelta, y el dia que
 * una region cobre en otra moneda la deduccion seria falsa.
 */
export function formatAmount(amountInCents: number, currency: string): string {
  return currency === BILLING_CURRENCY
    ? formatCopFromCents(amountInCents)
    : formatUsdFromCents(amountInCents);
}

export function formatProPrice(
  region: BillingRegion,
  amountInCents: number
): string {
  return region === 'CO'
    ? formatCopFromCents(amountInCents)
    : formatUsdFromCents(amountInCents);
}

/** Ahorro del plan anual vs 12 meses al precio mensual (~16,7 %). */
export function proAnnualSavingsPercentForRegion(region: BillingRegion): number {
  const billing = region === 'CO' ? PRO_BILLING : PRO_BILLING_LATAM;
  const monthlyYear = billing.monthlyAmountInCents * 12;
  const savings = monthlyYear - billing.yearlyAmountInCents;
  return Math.round((savings / monthlyYear) * 100);
}

/** @deprecated Usar proAnnualSavingsPercentForRegion('CO') */
export function proAnnualSavingsPercent(): number {
  return proAnnualSavingsPercentForRegion('CO');
}
