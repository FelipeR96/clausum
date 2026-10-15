import { useEffect, useState } from 'react';
import type { SubscriptionSummary } from '@clausum/shared';
import { fetchMe } from '@/services/user.service';
import { withApiRetry } from '@/services/api/retry';
import { buildFreeSubscriptionFallback } from '@/utils/subscription-fallback';

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
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(
    subscriptionConfirmed ? cachedSubscription : null
  );

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const refresh = () => {
      loadSubscription({ force: !subscriptionConfirmed })
        .then((sub) => {
          if (!cancelled) setSubscription(sub);
        })
        .catch(() => {
          if (!cancelled) setSubscription(buildFreeSubscriptionFallback());
        });
    };

    subscriptionListeners.add(refresh);
    refresh();

    pollId = window.setInterval(() => {
      if (subscriptionConfirmed || cancelled) {
        if (pollId) {
          clearInterval(pollId);
          pollId = null;
        }
        return;
      }
      refresh();
    }, 8000);

    const onFocus = () => {
      if (!subscriptionConfirmed) refresh();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      subscriptionListeners.delete(refresh);
      window.removeEventListener('focus', onFocus);
      if (pollId) clearInterval(pollId);
    };
  }, []);

  return subscription;
}

export function invalidateSubscriptionCache() {
  cachedSubscription = null;
  subscriptionConfirmed = false;
  cachePromise = null;
  subscriptionListeners.forEach((listener) => listener());
}
