import {
  BILLING_CURRENCY,
  BILLING_CURRENCY_LATAM,
  PRO_BILLING,
  PRO_BILLING_LATAM,
  SINGLE_ANALYSIS_BILLING,
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
  /**
   * Lo que cuesta analizar un documento sin cuenta.
   *
   * Opcional a proposito, y es lo que evita un estropicio: el documento
   * `config/pricing` que ya esta guardado NO lo lleva. Si fuera obligatorio,
   * dejaria de validar y los precios de Pro que haya configurado el
   * administrador volverian en silencio a los del codigo.
   */
  singleAnalysisAmountInCents?: number;
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
 * El precio del documento se limpia aparte, y no tumba la region si viene mal.
 *
 * Es una excepcion deliberada al "o todo o nada" de arriba, y conviene saber
 * por que. Esa regla existe para que un documento a medio escribir no deje la
 * plataforma cobrando cero en los campos que SIEMPRE tienen que estar. Este
 * campo puede no estar, asi que tiene un respaldo propio. Si un cero o una
 * cadena invalidaran la region entera, un dedazo en el precio del documento
 * revertiria tambien el precio de la suscripcion, y eso es mucho peor: el
 * administrador cobraria otra cosa por Pro sin enterarse.
 */
function precioDeDocumento(v: Record<string, unknown>): number | undefined {
  const valor = v.singleAnalysisAmountInCents;
  return typeof valor === 'number' && valor > 0 ? valor : undefined;
}

function limpiarRegion(v: RegionPricing): RegionPricing {
  const suelto = precioDeDocumento(v as unknown as Record<string, unknown>);
  return {
    monthlyAmountInCents: v.monthlyAmountInCents,
    yearlyAmountInCents: v.yearlyAmountInCents,
    currency: v.currency,
    ...(suelto ? { singleAnalysisAmountInCents: suelto } : {}),
  };
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
    CO: limpiarRegion(d.CO),
    LATAM: limpiarRegion(d.LATAM),
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

/**
 * Precio y moneda del analisis suelto, en una sola llamada.
 *
 * Juntos y no en dos funciones porque tienen que venir del mismo sitio: leer
 * el precio de Firestore y la moneda de las constantes es como se acaba
 * firmando una cantidad en pesos y cobrandola en dolares.
 */
export async function getSingleAnalysisPricing(
  region: BillingRegion
): Promise<{ amountInCents: number; currency: string }> {
  const pricing = await getPricing();
  const regional = region === 'CO' ? pricing.CO : pricing.LATAM;
  return {
    amountInCents:
      regional.singleAnalysisAmountInCents ??
      SINGLE_ANALYSIS_BILLING[region].amountInCents,
    currency: regional.currency,
  };
}
