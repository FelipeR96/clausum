import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useEmulators } from '@/firebase/config';
import { setDevPlan } from '@/services/user.service';
import { invalidateSubscriptionCache } from '@/hooks/useSubscriptionSummary';

type RiskProfileProGateProps = {
  contractId?: string;
  analysisPath?: string;
  onDevPlanActivated?: () => void;
};

export function RiskProfileProGate({
  contractId,
  analysisPath,
  onDevPlanActivated,
}: RiskProfileProGateProps) {
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
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="overflow-hidden rounded-3xl border border-red-200/80 bg-gradient-to-br from-red-50/90 via-surface to-amber-50/40 p-8 shadow-soft sm:p-10">
        <div className="mb-4 flex items-center gap-2 text-red-800">
          <span className="material-symbols-outlined text-2xl">shield_lock</span>
          <span className="text-xs font-bold uppercase tracking-widest">Plan Pro</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-on-surface sm:text-3xl">
          El perfil de riesgo es exclusivo de Pro
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant sm:text-base">
          En Free ves un resumen con cláusulas sensibles difuminadas en el análisis general.
          Pro desbloquea exposición legal detallada, cláusulas ausentes, fundamento normativo y
          playbook de negociación.
        </p>

        <ul className="mt-6 space-y-2 text-sm text-on-surface-variant">
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 text-base text-primary">check_circle</span>
            Vectores de riesgo con severidad y cláusula afectada
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 text-base text-primary">check_circle</span>
            Recomendaciones de negociación por hallazgo
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 text-base text-primary">check_circle</span>
            Generación automática al analizar (sin consumir doble cuota)
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
          >
            Actualizar a Pro
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
          {analysisPath && (
            <Link
              to={analysisPath}
              className="inline-flex items-center justify-center rounded-xl border border-outline-variant px-5 py-3 text-sm font-semibold text-on-surface-variant transition hover:border-primary/40"
            >
              Volver al análisis
            </Link>
          )}
          {useEmulators && (
            <button
              type="button"
              onClick={() => void activateDevPro()}
              disabled={activating}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-70"
            >
              {activating && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-800/60 border-t-transparent" />
              )}
              {activating ? 'Activando…' : 'Activar Pro local'}
            </button>
          )}
        </div>
        {devError && <p className="mt-3 text-sm text-red-700">{devError}</p>}
        {contractId && (
          <p className="mt-4 text-xs text-on-surface-variant">
            Contrato: <span className="font-mono">{contractId.slice(0, 8)}…</span>
          </p>
        )}
      </div>
    </div>
  );
}
