import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  SEED_PLANS,
  formatProPrice,
  proAnnualSavingsPercentForRegion,
  type BillingInterval,
} from '@clausum/shared';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/seo/PageSeo';
import { SEO_PAGES } from '@/seo/pages';
import { SeoBreadcrumbs } from '@/components/marketing/SeoBreadcrumbs';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { PricingDocumentFormats } from '@/components/pricing/PricingDocumentFormats';
import { BillingRegionSelector } from '@/components/billing/BillingRegionSelector';
import { useBillingRegion } from '@/hooks/useBillingRegion';
import { usePricing, amountFor } from '@/hooks/usePricing';
import { useAuth } from '@/auth/AuthProvider';
import { SETTINGS_BILLING_PATH } from '@/constants/app-paths';

export function PricingPage() {
  const page = SEO_PAGES.pricing;
  const plans = [SEED_PLANS.free, SEED_PLANS.pro];
  const ref = useRevealOnScroll<HTMLDivElement>();
  const { user, loading } = useAuth();
  const { region, setRegion, isColombia } = useBillingRegion();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const savingsPercent = proAnnualSavingsPercentForRegion(region);

  // De /api/pricing, la misma fuente que usa el cobro. Mientras llega se
  // muestran las constantes, que son el ultimo precio desplegado.
  const { pricing } = usePricing();
  const proPrice = amountFor(
    pricing,
    region,
    interval === 'annual' ? 'annual' : 'monthly'
  );

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to={SETTINGS_BILLING_PATH} replace />;
  }

  return (
    <MarketingLayout>
      <PageSeo page={page} />
      <SeoBreadcrumbs items={page.breadcrumbs} />
      <div className="bg-surface-container py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div ref={ref} className="reveal mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Precios
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold text-on-surface">
              Planes simples, sin sorpresas
            </h1>
            <p className="mt-4 text-lg text-on-surface-variant">
              Empieza gratis y actualiza a Pro cuando necesites más capacidad.
              {isColombia
                ? ' Pagos seguros con Wompi: tarjeta, PSE y Nequi.'
                : ' Pagos seguros con PayPal en USD: tarjeta débito o crédito.'}
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <BillingRegionSelector region={region} onChange={(r) => void setRegion(r)} />
          </div>

          <div className="mt-8 flex justify-center">
            <div
              className="inline-flex rounded-full border border-outline-variant bg-surface p-1"
              role="tablist"
              aria-label="Periodo de facturación Pro"
            >
              <button
                type="button"
                role="tab"
                aria-selected={interval === 'monthly'}
                onClick={() => setInterval('monthly')}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  interval === 'monthly'
                    ? 'bg-primary text-on-primary shadow-soft'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={interval === 'annual'}
                onClick={() => setInterval('annual')}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  interval === 'annual'
                    ? 'bg-primary text-on-primary shadow-soft'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Anual
                <span className="ml-1.5 text-xs font-bold opacity-90">
                  −{savingsPercent}%
                </span>
              </button>
            </div>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {plans.map((plan) => {
              const isPro = plan.slug === 'pro';
              const displayPrice = isPro ? proPrice : 0;

              return (
                <div
                  key={plan.slug}
                  className={`rounded-3xl border p-8 ${
                    isPro
                      ? 'border-primary bg-surface shadow-card'
                      : 'border-outline-variant bg-surface'
                  }`}
                >
                  {isPro && (
                    <span className="mb-4 inline-block rounded-full bg-primary-container px-3 py-1 text-xs font-bold text-on-primary-container">
                      Recomendado
                    </span>
                  )}
                  <h2 className="font-display text-2xl font-bold">{plan.name}</h2>
                  <p className="mt-2 font-display text-4xl font-extrabold text-primary">
                    {isPro ? formatProPrice(region, displayPrice) : 'Gratis'}
                    {displayPrice > 0 && (
                      <span className="text-base font-normal text-on-surface-variant">
                        {interval === 'annual' ? '/año' : '/mes'}
                      </span>
                    )}
                  </p>
                  {isPro && interval === 'annual' && (
                    <p className="mt-2 text-sm text-on-surface-variant">
                      Equivale a {formatProPrice(region, Math.round(proPrice / 12))}/mes ·
                      pagas 10 meses y usas 12
                    </p>
                  )}
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-on-surface-variant"
                      >
                        <span className="material-symbols-outlined text-lg text-primary">
                          check
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isPro ? (
                    <Link
                      to="/signup"
                      className="mt-8 flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-on-primary shadow-soft hover:bg-primary/90"
                    >
                      Crear cuenta y pagar
                    </Link>
                  ) : (
                    <Link
                      to="/signup"
                      className="mt-8 flex w-full items-center justify-center rounded-full border border-outline-variant bg-surface py-3 text-sm font-semibold text-on-surface hover:border-primary/40"
                    >
                      Crear cuenta gratis
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-sm text-on-surface-variant">
            El plan mensual se renueva cada mes. El plan anual cubre 12 meses con un solo
            pago de{' '}
            {formatProPrice(region, amountFor(pricing, region, 'annual'))}.
          </p>

          <PricingDocumentFormats />
        </div>
      </div>
    </MarketingLayout>
  );
}
