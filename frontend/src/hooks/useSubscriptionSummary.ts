import { useEffect, useMemo, useState } from 'react';
import type { SubscriptionSummary } from '@clausum/shared';
import { useAuth } from '@/auth/AuthProvider';
import { fetchMe } from '@/services/user.service';
import { withApiRetry } from '@/services/api/retry';
import { buildFreeSubscriptionFallback } from '@/utils/subscription-fallback';

// ─────────────────────────────────────────────────────────────────────────
// Dos reglas que no son opcionales aquí:
//
// 1. SIN SESIÓN NO SE LLAMA A /api/me. El endpoint exige token, así que sin
//    usuario solo puede devolver 401. Este hook lo usan componentes de
//    marketing (MarketingHeader, y por tanto las landings de SEO y las
//    páginas legales), de modo que un visitante anónimo disparaba la
//    llamada igual.
//
// 2. EL SONDEO ESTÁ ACOTADO. El `setInterval` solo se cancelaba cuando la
//    suscripción quedaba confirmada; para un anónimo eso nunca ocurría y
//    el sondeo seguía cada 8 segundos de forma indefinida. En producción
//    eso es una invocación de Cloud Function más una lectura de Firestore
//    cada 8 segundos por pestaña abierta, en las páginas de más tráfico:
//    unas 450 invocaciones por hora y pestaña, sin techo.
//
// El sondeo existía por una razón legítima --en desarrollo el emulador de
// Functions tarda en arrancar y la primera llamada falla-- así que se
// conserva, pero con un número máximo de intentos.
// ─────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 8_000;
const MAX_POLL_ATTEMPTS = 5;

let cachedSubscription: SubscriptionSummary | null = null;
/** true solo tras una respuesta exitosa de /api/me */
let subscriptionConfirmed = false;
let cachePromise: Promise<SubscriptionSummary> | null = null;
const subscriptionListeners = new Set<() => void>();

function loadSubscription(options?: { force?: boolean }): Promise<SubscriptionSummary> {
  const force = options?.force ?? false;

  if (cachedSubscription && subscriptionConfirmed && !force) {
    return Promise.resolve(cachedSubscription);
  }

  if (!cachePromise || force) {
    if (force) {
      cachePromise = null;
    }

    cachePromise = withApiRetry(() => fetchMe(), { attempts: 6, baseDelayMs: 1500 })
      .then((me) => {
        cachedSubscription = me.subscription;
        subscriptionConfirmed = true;
        cachePromise = null;
        subscriptionListeners.forEach((listener) => listener());
        return me.subscription;
      })
      .catch(() => {
        cachePromise = null;
        subscriptionConfirmed = false;
        // No cachear Free: si la API falló al arrancar, el siguiente refresh debe reintentar.
        return buildFreeSubscriptionFallback();
      });
  }

  return cachePromise;
}

/** Suscripción del usuario (cacheada en sesión) para mostrar límites y OCR. */
export function useSubscriptionSummary() {
  const { user, loading: authLoading } = useAuth();
  const [fetched, setFetched] = useState<SubscriptionSummary | null>(
    subscriptionConfirmed ? cachedSubscription : null
  );

  // Para un anónimo los límites son los del plan Free y son
  // deterministas, así que se calculan durante el render. Empujarlos desde
  // un efecto provocaría un render en cascada sin ganar nada.
  const anonymousFallback = useMemo(() => buildFreeSubscriptionFallback(), []);

  useEffect(() => {
    // Mientras Firebase resuelve la sesión no se sabe aún si hay usuario:
    // esperar evita una llamada que acabaría en 401. Y sin usuario no hay
    // nada que preguntarle al servidor.
    if (authLoading || !user) return;

    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;

    const stopPolling = () => {
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    const refresh = () => {
      loadSubscription({ force: !subscriptionConfirmed })
        .then((sub) => {
          if (!cancelled) setFetched(sub);
        })
        .catch(() => {
          if (!cancelled) setFetched(buildFreeSubscriptionFallback());
        });
    };

    subscriptionListeners.add(refresh);
    refresh();

    pollId = window.setInterval(() => {
      attempts += 1;
      if (subscriptionConfirmed || cancelled || attempts >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        return;
      }
      refresh();
    }, POLL_INTERVAL_MS) as unknown as ReturnType<typeof setInterval>;

    const onFocus = () => {
      if (!subscriptionConfirmed) refresh();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      subscriptionListeners.delete(refresh);
      window.removeEventListener('focus', onFocus);
      stopPolling();
    };
  }, [user, authLoading]);

  if (authLoading) return null;
  if (!user) return anonymousFallback;
  return fetched;
}

export function invalidateSubscriptionCache() {
  cachedSubscription = null;
  subscriptionConfirmed = false;
  cachePromise = null;
  subscriptionListeners.forEach((listener) => listener());
}
