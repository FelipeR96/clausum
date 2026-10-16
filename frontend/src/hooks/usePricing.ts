import { useEffect, useState } from 'react';
import {
  PRO_BILLING,
  PRO_BILLING_LATAM,
  type BillingInterval,
  type BillingRegion,
} from '@clausum/shared';

interface RegionPricing {
  monthlyAmountInCents: number;
  yearlyAmountInCents: number;
  currency: string;
}

interface Pricing {
  CO: RegionPricing;
  LATAM: RegionPricing;
}

/**
 * Precios vigentes, leidos de la misma fuente que usa el cobro.
 *
 * Mientras llega la respuesta se muestran las constantes compartidas, que
 * son el ultimo precio desplegado. Asi la pagina no parpadea ni aparece
 * vacia; como mucho, durante un instante muestra un precio viejo si acaban
 * de cambiarlo.
 *
 * Es una lectura publica (/api/pricing) y por eso no necesita sesion: la
 * pagina de precios la ve cualquiera.
 */
const FALLBACK: Pricing = {
  CO: {
    monthlyAmountInCents: PRO_BILLING.monthlyAmountInCents,
    yearlyAmountInCents: PRO_BILLING.yearlyAmountInCents,
    currency: PRO_BILLING.currency,
  },
  LATAM: {
    monthlyAmountInCents: PRO_BILLING_LATAM.monthlyAmountInCents,
    yearlyAmountInCents: PRO_BILLING_LATAM.yearlyAmountInCents,
    currency: PRO_BILLING_LATAM.currency,
  },
};

let cache: Pricing | null = null;

export function usePricing(): { pricing: Pricing; loading: boolean } {
  const [pricing, setPricing] = useState<Pricing>(cache ?? FALLBACK);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache) return;
    let vigente = true;

    void fetch('/api/pricing')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Pricing | null) => {
        if (!vigente || !data?.CO || !data?.LATAM) return;
        cache = { CO: data.CO, LATAM: data.LATAM };
        setPricing(cache);
      })
      .catch(() => {
        // Se queda con las constantes. Un fallo de red no debe dejar la
        // pagina de precios sin precios.
      })
      .finally(() => {
        if (vigente) setLoading(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  return { pricing, loading };
}

export function amountFor(
  pricing: Pricing,
  region: BillingRegion,
  interval: BillingInterval
): number {
  const r = region === 'CO' ? pricing.CO : pricing.LATAM;
  return interval === 'annual' ? r.yearlyAmountInCents : r.monthlyAmountInCents;
}
