import type { BillingRegion } from '@clausum/shared';

export const BILLING_REGION_STORAGE_KEY = 'clausum_billing_region';

export function readBillingRegionFromStorage(): BillingRegion {
  if (typeof window === 'undefined') return 'CO';
  const stored = localStorage.getItem(BILLING_REGION_STORAGE_KEY);
  return stored === 'LATAM' ? 'LATAM' : 'CO';
}

export function writeBillingRegionToStorage(region: BillingRegion): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BILLING_REGION_STORAGE_KEY, region);
}

export function billingRegionLabel(region: BillingRegion): string {
  return region === 'CO' ? 'Colombia' : 'Resto de LATAM';
}

export function billingRegionPaymentHint(region: BillingRegion): string {
  return region === 'CO'
    ? 'Pagos en COP con Wompi: tarjeta, PSE o Nequi.'
    : 'Pagos en USD con PayPal: tarjeta de débito o crédito.';
}

export function billingRegionDisclaimer(region: BillingRegion): string {
  return region === 'CO'
    ? 'Precios en pesos colombianos (COP). Facturación y medios de pago locales vía Wompi.'
    : 'Precios en dólares estadounidenses (USD). PayPal procesa el cobro; pueden aplicar comisiones y conversión según tu banco.';
}
