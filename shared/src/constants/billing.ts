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
