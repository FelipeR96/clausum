import { Link } from 'react-router-dom';
import type { AnalysisResultData } from '@/types/analysis-view.types';
import { contractRiskProfilePath } from '@/utils/risk-routes';

type AnalysisRiskTeaserBannerProps = {
  data: AnalysisResultData;
  contractId: string;
  isPro: boolean;
};

export function AnalysisRiskTeaserBanner({
  data,
  contractId,
  isPro,
}: AnalysisRiskTeaserBannerProps) {
  const { high, medium } = data.riskDistribution;
  const riskPath = contractRiskProfilePath(contractId);

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50/90 via-surface to-amber-50/50 p-6 shadow-soft sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="material-symbols-outlined text-red-700">shield</span>
            <span className="text-xs font-bold uppercase tracking-widest text-red-800">
              {isPro ? 'Perfil de riesgo generado' : 'Perfil de riesgo Pro'}
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-on-surface sm:text-2xl">
            {isPro
              ? `${data.revisionsSuggested} alertas detectadas y listas para revisar`
              : `${data.revisionsSuggested} alertas detectadas — análisis profundo pendiente`}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant sm:text-base">
            {isPro
              ? 'Tu plan Pro genera el perfil de riesgo automáticamente junto con el análisis general.'
              : 'Este resumen te ayuda a entender el contrato. Pro desbloquea exposición legal, cláusulas ausentes y recomendaciones de negociación.'}{' '}
            Hay {high + medium} cláusulas sensibles ({high} críticas, {medium} moderadas).
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            to={isPro ? riskPath : '/pricing'}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
          >
            {isPro ? 'Ver perfil de riesgo completo' : 'Actualizar a Pro'}
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
          <p className="text-center text-xs text-on-surface-variant lg:text-left">
            {isPro
              ? 'Incluye playbook de negociación y cláusulas faltantes'
              : 'Preview bloqueado para incentivar la suscripción'}
          </p>
        </div>
      </div>
    </section>
  );
}
