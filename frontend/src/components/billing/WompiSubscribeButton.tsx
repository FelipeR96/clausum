import { useEffect, useRef, useState } from 'react';
import type { BillingInterval } from '@clausum/shared';
import { SETTINGS_BILLING_PATH } from '@/constants/app-paths';
import {
  completeWompiSubscription,
  getWompiSubscribeConfig,
  type WompiSubscribeConfigPayload,
} from '@/services/subscription.service';

type WompiSubscribeButtonProps = {
  interval: BillingInterval;
  className?: string;
  disabled?: boolean;
  onSubscribed?: () => void;
};

export function WompiSubscribeButton({
  interval,
  className,
  disabled,
  onSubscribed,
}: WompiSubscribeButtonProps) {
  const widgetHostRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<WompiSubscribeConfigPayload | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedData, setAcceptedData] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    setLoadingConfig(true);
    setError(null);
    try {
      const payload = await getWompiSubscribeConfig(interval);
      setConfig(payload);
      setAcceptedTerms(false);
      setAcceptedData(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo preparar la suscripción. Intenta de nuevo.';
      setError(message);
      setConfig(null);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    setConfig(null);
    setAcceptedTerms(false);
    setAcceptedData(false);
    setError(null);
  }, [interval]);

  useEffect(() => {
    const host = widgetHostRef.current;
    if (!host || !config || !acceptedTerms || !acceptedData) {
      host?.replaceChildren();
      return;
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '#';

    const script = document.createElement('script');
    script.src = config.widgetUrl;
    script.setAttribute('data-render', 'button');
    script.setAttribute('data-widget-operation', 'tokenize');
    script.setAttribute('data-public-key', config.publicKey);
    form.appendChild(script);

    const handleSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      const token = new FormData(form).get('payment_source_token')?.toString();
      if (!token) {
        setError('No recibimos el token de tarjeta. Intenta de nuevo.');
        return;
      }

      setSubscribing(true);
      setError(null);
      void completeWompiSubscription(interval, config.reference, token)
        .then((result) => {
          if (result.status === 'redirect' && result.asyncPaymentUrl) {
            window.location.href = result.asyncPaymentUrl;
            return;
          }
          onSubscribed?.();
          window.location.href = `${SETTINGS_BILLING_PATH}&pago=ok`;
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : 'No se pudo activar la suscripción. Intenta de nuevo.';
          setError(message);
          setSubscribing(false);
        });
    };

    form.addEventListener('submit', handleSubmit);
    host.replaceChildren(form);

    return () => {
      form.removeEventListener('submit', handleSubmit);
      host.replaceChildren();
    };
  }, [acceptedData, acceptedTerms, config, interval, onSubscribed]);

  const busy = disabled || loadingConfig || subscribing;

  return (
    <div className="w-full">
      {!config ? (
        <button
          type="button"
          onClick={() => void loadConfig()}
          disabled={busy}
          className={className}
        >
          {loadingConfig ? 'Preparando Wompi…' : 'Suscribirse con tarjeta (Wompi)'}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 text-sm text-on-surface-variant">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                disabled={subscribing}
              />
              <span>
                Acepto los{' '}
                <a
                  href={config.acceptancePermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  términos y condiciones de Wompi
                </a>
                .
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acceptedData}
                onChange={(e) => setAcceptedData(e.target.checked)}
                disabled={subscribing}
              />
              <span>
                Autorizo el{' '}
                <a
                  href={config.personalDataPermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  tratamiento de datos personales
                </a>{' '}
                según Wompi.
              </span>
            </label>
          </div>

          {acceptedTerms && acceptedData && (
            <div ref={widgetHostRef} className="min-h-[44px]" />
          )}

          {subscribing && (
            <p className="text-center text-xs text-on-surface-variant">
              Procesando suscripción…
            </p>
          )}

          <button
            type="button"
            onClick={() => setConfig(null)}
            disabled={subscribing}
            className="text-xs font-medium text-on-surface-variant hover:text-on-surface"
          >
            Cambiar periodo o reiniciar
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-center text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
