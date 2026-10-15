import { Link } from 'react-router-dom';
import { SETTINGS_BILLING_PATH } from '@/constants/app-paths';
import { ExportPdfButton } from '@/components/contracts/ExportPdfButton';
import type { AnalysisResultData } from '@/types/analysis-view.types';
import { contractRiskProfilePath } from '@/utils/risk-routes';

type AnalysisResultHeaderProps = {
  data: AnalysisResultData;
  contractId: string;
  isPro: boolean;
};

export function AnalysisResultHeader({ data, contractId, isPro }: AnalysisResultHeaderProps) {
  const riskPath = isPro ? contractRiskProfilePath(contractId) : SETTINGS_BILLING_PATH;

  return (
    <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-primary-container/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-on-primary-container">
            {data.contractTypeLabel}
          </span>
          <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
            Análisis general
          </span>
          <span className="text-sm text-on-surface-variant">
            Último análisis: {data.analyzedAgo}
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold text-on-surface sm:text-3xl">
          {data.contractTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          {data.parties ? (
            <>
              Contrato entre{' '}
              <span className="font-semibold text-on-surface">{data.parties[0]}</span> y{' '}
              <span className="font-semibold text-on-surface">{data.parties[1]}</span>. Este
              informe describe la estructura del acuerdo; el perfil de riesgo profundiza en
              exposición legal.
            </>
          ) : (
            <>
              Documento analizado con IA. Este informe describe la estructura del acuerdo; el
              perfil de riesgo profundiza en exposición legal.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:items-end">
        <div className="flex flex-wrap items-center gap-3">
        <Link
          to={riskPath}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100"
        >
          <span className="material-symbols-outlined text-lg">shield</span>
          {isPro ? 'Perfil de riesgo' : 'Perfil de riesgo Pro'}
        </Link>
        <ExportPdfButton contractId={contractId} isPro={isPro} />
        <Link
          to="/panel/contratos"
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Historial
        </Link>
        </div>
      </div>
    </div>
  );
}
