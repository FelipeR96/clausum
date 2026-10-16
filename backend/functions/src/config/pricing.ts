import {
  BILLING_CURRENCY,
  BILLING_CURRENCY_LATAM,
  PRO_BILLING,
  PRO_BILLING_LATAM,
  type BillingInterval,
  type BillingRegion,
} from '@clausum/shared';
import { adminDb } from '../firebase/admin';

/**
 * Precios del plan Pro, con Firestore como fuente de verdad.
 *
 * Antes vivian en shared/constants/billing.ts y los leian dos sitios: lo que
 * muestra el frontend y lo que cobra Wompi. Cambiar un precio exigia tocar
 * codigo y desplegar.
 *
 * Ahora el documento `config/pricing` manda, y las constantes compartidas
 * quedan como respaldo para cuando el documento no existe (proyecto recien
 * sembrado, o un fallo de lectura). Lo importante es que el cobro y la
 * pantalla lean lo mismo: mostrar un precio y cobrar otro seria peor que no
 * poder cambiarlo.
 *
 * Quien ya esta suscrito no se ve afectado: el monto al que se suscribio
 * queda guardado en su documento y la renovacion cobra ese. Un cambio aqui
 * solo alcanza a cobros nuevos y usuarios nuevos.
 */

export interface RegionPricing {
  monthlyAmountInCents: number;
  yearlyAmountInCents: number;
  currency: string;
}

export interface Pricing {
  CO: RegionPricing;
  LATAM: RegionPricing;
  updatedAt?: FirebaseFirestore.Timestamp;
  updatedBy?: string;
}

export const PRICING_DOC = 'pricing';

/** Lo que dice el codigo. Solo se usa si Firestore no tiene nada. */
export const FALLBACK_PRICING: Pricing = {
  CO: {
    monthlyAmountInCents: PRO_BILLING.monthlyAmountInCents,
    yearlyAmountInCents: PRO_BILLING.yearlyAmountInCents,
    currency: BILLING_CURRENCY,
  },
  LATAM: {
    monthlyAmountInCents: PRO_BILLING_LATAM.monthlyAmountInCents,
    yearlyAmountInCents: PRO_BILLING_LATAM.yearlyAmountInCents,
    currency: BILLING_CURRENCY_LATAM,
  },
};

// Mismo criterio que el cache de planes: 60s. Un precio recien cambiado
// tarda como mucho un minuto en verse en todas las instancias.
const CACHE_TTL_MS = 60_000;
let cache: { value: Pricing; expiresAt: number } | null = null;

function isRegionPricing(value: unknown): value is RegionPricing {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.monthlyAmountInCents === 'number' &&
    v.monthlyAmountInCents > 0 &&
    typeof v.yearlyAmountInCents === 'number' &&
    v.yearlyAmountInCents > 0 &&
    typeof v.currency === 'string'
  );
}

/**
 * Un documento a medio escribir no debe poder dejar la plataforma cobrando
 * cero. Si cualquiera de las dos regiones no cuadra, se cae al respaldo
 * entera en vez de mezclar.
 */
function parsePricing(data: unknown): Pricing | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (!isRegionPricing(d.CO) || !isRegionPricing(d.LATAM)) return null;
  return {
    CO: d.CO,
    LATAM: d.LATAM,
    updatedAt: d.updatedAt as FirebaseFirestore.Timestamp | undefined,
    updatedBy: typeof d.updatedBy === 'string' ? d.updatedBy : undefined,
  };
}

export async function getPricing(): Promise<Pricing> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  try {
    const doc = await adminDb().collection('config').doc(PRICING_DOC).get();
    const parsed = doc.exists ? parsePricing(doc.data()) : null;
    const value = parsed ?? FALLBACK_PRICING;
    cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  } catch {
    // Nunca dejar caer un checkout por un fallo de lectura: se cobra lo que
    // dice el codigo, que es el ultimo precio desplegado.
    return FALLBACK_PRICING;
  }
}

/** Tras escribir un precio nuevo, para no esperar al TTL en esta instancia. */
export function invalidatePricingCache(): void {
  cache = null;
}

export async function getAmountInCents(
  region: BillingRegion,
  interval: BillingInterval
): Promise<number> {
  const pricing = await getPricing();
  const regional = region === 'CO' ? pricing.CO : pricing.LATAM;
  return interval === 'annual'
    ? regional.yearlyAmountInCents
    : regional.monthlyAmountInCents;
}

export async function getCurrency(region: BillingRegion): Promise<string> {
  const pricing = await getPricing();
  return region === 'CO' ? pricing.CO.currency : pricing.LATAM.currency;
}
