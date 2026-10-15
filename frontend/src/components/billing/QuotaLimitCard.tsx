import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useEmulators } from '@/firebase';
import { setDevPlan } from '@/services/user.service';
import { invalidateSubscriptionCache } from '@/hooks/useSubscriptionSummary';

type QuotaLimitCardProps = {
  message: string;
  onDevPlanActivated?: () => void;
};

export function QuotaLimitCard({ message, onDevPlanActivated }: QuotaLimitCardProps) {
  const [activating, setActivating] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  const activateDevPro = async () => {
    setActivating(true);
    setDevError(null);
    try {
      await setDevPlan('pro');
      invalidateSubscriptionCache();
      onDevPlanActivated?.();
    } catch {
      setDevError('No pudimos activar Pro en el emulador. Revisa que el backend esté activo.');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-soft">
      <div className="flex gap-3">
        <span className="material-symbols-outlined mt-0.5 text-amber-700">lock_clock</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold">Límite mensual alcanzado</h2>
          <p className="mt-1 text-sm leading-relaxed">{message}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
            >
              Ver planes
            </Link>
            {useEmulators && (
              <button
                type="button"
                onClick={() => void activateDevPro()}
                disabled={activating}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white/70 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
              >
                {activating && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-800/60 border-t-transparent" />
                )}
                {activating ? 'Activando…' : 'Activar Pro local'}
              </button>
            )}
          </div>
          {devError && <p className="mt-3 text-sm text-red-700">{devError}</p>}
        </div>
      </div>
    </div>
  );
}
