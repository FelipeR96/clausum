import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SEED_PLANS,
  formatProPrice,
  proAnnualSavingsPercentForRegion,
  type BillingInterval,
  type BillingRegion,
} from '@clausum/shared';
import { fetchMe, setDevPlan, type MeResponse } from '@/services/user.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';
import { invalidateSubscriptionCache } from '@/hooks/useSubscriptionSummary';
import { WompiSubscribeButton } from '@/components/billing/WompiSubscribeButton';
import { WompiCheckoutButton } from '@/components/billing/WompiCheckoutButton';
import { PayPalCheckoutButton } from '@/components/billing/PayPalCheckoutButton';
import { AvisoAntesDePagar } from '@/components/billing/AvisoAntesDePagar';
import { BillingRegionSelector } from '@/components/billing/BillingRegionSelector';
import { useBillingRegion } from '@/hooks/useBillingRegion';
import { usePricing, amountFor } from '@/hooks/usePricing';
import { useEmulators } from '@/firebase/config';
import {
  cancelPayPalSubscription,
  cancelWompiSubscription,
  fetchWompiStatus,
} from '@/services/subscription.service';

function formatPeriodEnd(iso?: string): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
  }).format(new Date(iso));
}

export function SettingsBillingTab() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renewInterval, setRenewInterval] = useState<BillingInterval>('monthly');
  const [devActivating, setDevActivating] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const [wompiRecurrent, setWompiRecurrent] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentNotice = searchParams.get('pago') === 'ok';
  const usingEmulators = useEmulators;

  const initialRegion = (me?.billingRegion as BillingRegion | undefined) ?? undefined;
  const { region, setRegion, isColombia } = useBillingRegion(initialRegion);
  const savingsPercent = proAnnualSavingsPercentForRegion(region);
  const { pricing } = usePricing();
  const monthlyPrice = amountFor(pricing, region, 'monthly');
  const annualPrice = amountFor(pricing, region, 'annual');

  useEffect(() => {
    fetchMe()
      .then((data) => {
        setMe(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        setLoadError(
          getUserFacingErrorMessage(err, { action: 'cargar tu suscripción' })
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isColombia) return;
    fetchWompiStatus()
      .then((status) => setWompiRecurrent(status.recurrent))
      .catch(() => setWompiRecurrent(false));
  }, [isColombia]);

  const planId = me?.subscription.planId ?? 'free';
  const planSeed = SEED_PLANS[planId as 'free' | 'pro'] ?? SEED_PLANS.free;
  const usage = me?.subscription.usage;
  const isPro = planId === 'pro';
  const periodEnd = formatPeriodEnd(me?.subscription.currentPeriodEnd);
  const billingProvider =
    me?.subscription.billingProvider ?? (isColombia ? 'wompi' : 'paypal');
  const cancelAtPeriodEnd = me?.subscription.cancelAtPeriodEnd ?? false;
  const billingInterval = me?.subscription.billingInterval;
  // Solo tiene sentido ofrecer el cambio hacia arriba: de anual a mensual
  // no, porque implicaria devolver dinero.
  const puedePasarseAAnual = isPro && billingInterval === 'monthly';

  const dismissPaymentNotice = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('pago');
    setSearchParams(next, { replace: true });
  };

  const reloadMe = () => {
    setLoading(true);
    fetchMe()
      .then((data) => {
        setMe(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        setLoadError(
          getUserFacingErrorMessage(err, { action: 'cargar tu suscripción' })
        );
      })
      .finally(() => setLoading(false));
  };

  const handleCancelRenewal = async () => {
    setCanceling(true);
    setCancelError(null);
    setCancelNotice(null);
    try {
      const result =
        billingProvider === 'wompi'
          ? await cancelWompiSubscription()
          : await cancelPayPalSubscription();
      invalidateSubscriptionCache();
      reloadMe();
      setCancelNotice(result.message);
    } catch {
      setCancelError(
        billingProvider === 'wompi'
          ? 'No pudimos cancelar la renovación Wompi. Intenta de nuevo o escribe a soporte.'
          : 'No pudimos cancelar la renovación. Intenta desde tu cuenta PayPal o escribe a soporte.'
      );
    } finally {
      setCanceling(false);
    }
  };

  const activateDevPlan = async (planId: 'free' | 'pro') => {
    setDevActivating(true);
    setDevError(null);
    try {
      await setDevPlan(planId);
      invalidateSubscriptionCache();
      reloadMe();
    } catch {
      setDevError(
        planId === 'pro'
          ? 'No pudimos activar Pro en el emulador. Revisa que Functions esté en marcha.'
          : 'No pudimos volver a Free en el emulador.'
      );
    } finally {
      setDevActivating(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-on-surface sm:text-3xl">
          Facturación y suscripción
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Consulta tu plan, uso mensual y paga con{' '}
          {isColombia ? 'Wompi (Colombia)' : 'PayPal (LATAM)'}.
        </p>
      </header>

      {paymentNotice && (
        <div
          className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-container/30 p-4"
          role="status"
        >
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-primary">info</span>
            <div>
              <p className="font-semibold text-on-surface">
                Pago recibido — procesando activación
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Si tu pago fue aprobado, tu plan Pro se activará en unos segundos.
                Recarga esta página si no ves el cambio de inmediato.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissPaymentNotice}
            className="text-sm font-medium text-primary hover:underline"
          >
            Entendido
          </button>
        </div>
      )}

      {loadError && (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {loadError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Cargando suscripción…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="glass-panel rounded-2xl p-4">
              <BillingRegionSelector
                region={region}
                onChange={(r) => void setRegion(r)}
                className="w-full"
              />
            </div>

            <div className="glass-panel rounded-2xl border-l-4 border-primary p-6 sm:p-8">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Plan actual
                  </p>
                  <h2 className="font-display text-3xl font-bold text-on-surface">
                    {me?.subscription.planName ?? planSeed.name}
                  </h2>
                  {isPro && periodEnd && (
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Activo hasta el {periodEnd}
                    </p>
                  )}
                </div>
                {isPro && (
                  <span className="rounded-full bg-primary-container/50 px-4 py-1 text-sm font-bold text-on-primary-container">
                    {formatProPrice(region, monthlyPrice)} / mes
                  </span>
                )}
              </div>

              <ul className="mb-8 space-y-3">
                {planSeed.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-on-surface-variant"
                  >
                    <span
                      className="material-symbols-outlined text-lg text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {puedePasarseAAnual && (
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="font-display text-lg font-bold">Pasar a plan anual</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Pagas {formatProPrice(region, annualPrice)} y ahorras un{' '}
                  {savingsPercent}% frente a pagar mes a mes.
                </p>
                {/* Lo que mas tranquiliza de un cambio de plan es saber que no
                    se pierde lo pagado. Por eso se dice aqui y no en letra
                    pequena. */}
                <p className="mt-2 text-sm text-on-surface-variant">
                  No pierdes los días que ya pagaste: el año empieza a contar
                  {periodEnd ? ` el ${periodEnd}` : ' al terminar tu periodo actual'}.
                </p>

                {isColombia ? (
                  wompiRecurrent ? (
                    <div className="mt-4 space-y-3">
                      <WompiSubscribeButton
                        interval="annual"
                        className="w-full rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                        onSubscribed={() => invalidateSubscriptionCache()}
                      />
                      <WompiCheckoutButton
                        interval="annual"
                        className="w-full rounded-xl border border-outline-variant px-6 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Pago único (PSE / Nequi / tarjeta)
                      </WompiCheckoutButton>
                    </div>
                  ) : (
                    <WompiCheckoutButton
                      interval="annual"
                      className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Pasar a anual con Wompi
                    </WompiCheckoutButton>
                  )
                ) : (
                  <PayPalCheckoutButton
                    interval="annual"
                    className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Pasar a anual con PayPal
                  </PayPalCheckoutButton>
                )}

                <AvisoAntesDePagar />
              </div>
            )}

            {!isPro && (
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="font-display text-lg font-bold">Actualizar a Pro</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {isColombia
                    ? wompiRecurrent
                      ? 'Suscríbete con tarjeta y Wompi renovará tu plan automáticamente. PSE y Nequi siguen disponibles como pago único por periodo.'
                      : 'Paga con tarjeta, PSE o Nequi a través de Wompi.'
                    : 'Paga con tarjeta débito o crédito en USD a través de PayPal.'}
                </p>

                <div className="mt-4 inline-flex rounded-full border border-outline-variant bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setRenewInterval('monthly')}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                      renewInterval === 'monthly'
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    Mensual · {formatProPrice(region, monthlyPrice)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenewInterval('annual')}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                      renewInterval === 'annual'
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    Anual · {formatProPrice(region, annualPrice)} (−{savingsPercent}%)
                  </button>
                </div>

                {isColombia ? (
                  wompiRecurrent ? (
                    <div className="mt-4 space-y-3">
                      <WompiSubscribeButton
                        interval={renewInterval}
                        className="w-full rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                        onSubscribed={() => invalidateSubscriptionCache()}
                      />
                      <WompiCheckoutButton
                        interval={renewInterval}
                        className="w-full rounded-xl border border-outline-variant px-6 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Pago único (PSE / Nequi / tarjeta)
                      </WompiCheckoutButton>
                    </div>
                  ) : (
                    <WompiCheckoutButton
                      interval={renewInterval}
                      className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Pagar con Wompi
                    </WompiCheckoutButton>
                  )
                ) : (
                  <PayPalCheckoutButton
                    interval={renewInterval}
                    className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Pagar con PayPal
                  </PayPalCheckoutButton>
                )}

                <AvisoAntesDePagar />
              </div>
            )}

            <div className="glass-panel rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold">Uso este mes</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-surface-container p-4">
                  <p className="text-xs font-semibold uppercase text-on-surface-variant">
                    Análisis
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold">
                    {usage?.analysesCount ?? 0}
                    <span className="text-base font-normal text-on-surface-variant">
                      {' '}
                      /{' '}
                      {usage?.analysesLimit === -1
                        ? '∞'
                        : (usage?.analysesLimit ?? 3)}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-surface-container p-4">
                  <p className="text-xs font-semibold uppercase text-on-surface-variant">
                    Comparaciones
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold">
                    {usage?.comparisonsCount ?? 0}
                    <span className="text-base font-normal text-on-surface-variant">
                      {' '}
                      /{' '}
                      {usage?.comparisonsLimit === -1
                        ? '∞'
                        : (usage?.comparisonsLimit ?? 1)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold">Métodos de pago</h3>
              {isColombia ? (
                <>
                  <p className="mt-3 text-sm text-on-surface-variant">
                    Wompi: tarjeta débito/crédito, PSE y Nequi. No almacenamos datos de
                    tu tarjeta.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-on-surface-variant">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-primary">
                        credit_card
                      </span>
                      Tarjeta
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-primary">
                        account_balance
                      </span>
                      PSE
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-primary">
                        smartphone
                      </span>
                      Nequi
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm text-on-surface-variant">
                    PayPal procesa pagos en USD con tarjeta débito o crédito. Pueden
                    aplicar comisiones y conversión según tu banco.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-on-surface-variant">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-primary">
                        credit_card
                      </span>
                      Tarjeta internacional
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-primary">
                        payments
                      </span>
                      Cuenta PayPal (opcional)
                    </li>
                  </ul>
                </>
              )}
            </div>

            {isPro && (
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="font-display text-lg font-bold">Renovación del plan</h3>
                {billingProvider === 'wompi' && !wompiRecurrent ? (
                  <p className="mt-3 text-sm text-on-surface-variant">
                    Tu plan se pagó con Wompi en modo pago único y{' '}
                    <strong className="font-semibold text-on-surface">no se renueva solo</strong>.
                    {periodEnd ? (
                      <>
                        {' '}
                        Disfruta Pro hasta el <strong>{periodEnd}</strong>. Si no quieres continuar,
                        no realices un nuevo pago al vencer.
                      </>
                    ) : (
                      ' Si no quieres continuar, no realices un nuevo pago al vencer tu periodo.'
                    )}
                  </p>
                ) : (
                  <>
                    <p className="mt-3 text-sm text-on-surface-variant">
                      {billingProvider === 'wompi'
                        ? 'Wompi renovará tu suscripción automáticamente con la tarjeta guardada.'
                        : 'PayPal renueva tu suscripción automáticamente.'}{' '}
                      Puedes cancelar la renovación y conservar Pro hasta el fin del periodo pagado
                      {periodEnd ? ` (${periodEnd})` : ''}.
                    </p>
                    {cancelAtPeriodEnd ? (
                      <p className="mt-4 rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
                        La renovación automática ya está cancelada. Mantienes Pro hasta que venza tu
                        periodo actual.
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleCancelRenewal()}
                        disabled={canceling}
                        className="mt-4 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:cursor-wait disabled:opacity-70"
                      >
                        {canceling ? 'Cancelando…' : 'Cancelar renovación automática'}
                      </button>
                    )}
                    {cancelNotice && (
                      <p className="mt-3 text-sm text-primary" role="status">
                        {cancelNotice}
                      </p>
                    )}
                    {cancelError && (
                      <p className="mt-3 text-sm text-red-700" role="alert">
                        {cancelError}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="glass-panel rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold">Historial de facturación</h3>
              <p className="mt-3 text-sm text-on-surface-variant">
                {isColombia
                  ? 'Los comprobantes de Wompi se envían al correo que uses al pagar.'
                  : 'PayPal envía confirmaciones de pago y suscripción a tu correo.'}
              </p>
            </div>

            {usingEmulators && (
              <div className="glass-panel rounded-2xl border border-dashed border-outline-variant p-6">
                <h3 className="font-display text-lg font-bold">Emulador</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Sin llaves de pago puedes simular la suscripción Pro en local.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!isPro && (
                    <button
                      type="button"
                      onClick={() => void activateDevPlan('pro')}
                      disabled={devActivating}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-70"
                    >
                      {devActivating && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-800/60 border-t-transparent" />
                      )}
                      {devActivating ? 'Activando…' : 'Activar Pro local'}
                    </button>
                  )}
                  {isPro && (
                    <button
                      type="button"
                      onClick={() => void activateDevPlan('free')}
                      disabled={devActivating}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:cursor-wait disabled:opacity-70"
                    >
                      {devActivating ? 'Cambiando…' : 'Volver a Free (prueba)'}
                    </button>
                  )}
                </div>
                {devError && <p className="mt-3 text-sm text-red-700">{devError}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
