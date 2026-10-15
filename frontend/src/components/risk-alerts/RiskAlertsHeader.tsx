import { Link } from 'react-router-dom';
import { ExportPdfButton } from '@/components/contracts/ExportPdfButton';
import type { RiskAlertsData } from '@/types/risk-alerts.types';

type RiskAlertsHeaderProps = {
  data: RiskAlertsData;
  contractId?: string;
  isPro: boolean;
};

export function RiskAlertsHeader({ data, contractId, isPro }: RiskAlertsHeaderProps) {
  const totalRisks =
    data.severityCounts.high + data.severityCounts.medium + data.severityCounts.info;

  return (
    <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-800">
            Análisis profundo
          </span>
          <span className="rounded-full bg-primary-container/40 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
            Perfil de riesgo
          </span>
          <span className="text-sm text-on-surface-variant">
            ID de análisis: #{data.analysisId}
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold text-on-surface sm:text-3xl">
          Perfil de riesgo y playbook de negociación
        </h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">{data.scannedSummary}</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          {totalRisks} alertas
          {data.missingClauses.length > 0
            ? ` · ${data.missingClauses.length} cláusulas ausentes`
            : ''}{' '}
          · {data.contractType}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {contractId && (
          <ExportPdfButton contractId={contractId} isPro={isPro} />
        )}
        {contractId && (
          <Link
            to={`/panel/contratos/${contractId}/resultado`}
            className="flex items-center gap-2 rounded-xl border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary-container/30"
          >
            <span className="material-symbols-outlined text-lg">analytics</span>
            Ver análisis completo
          </Link>
        )}
      </div>
    </div>
  );
}
