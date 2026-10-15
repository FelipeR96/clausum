import { Link } from 'react-router-dom';
import type { AnalysisResultData } from '@/types/analysis-view.types';
import { contractRiskProfilePath } from '@/utils/risk-routes';

type AnalysisSummarySectionProps = {
  data: AnalysisResultData;
  contractId: string;
};

export function AnalysisSummarySection({ data, contractId }: AnalysisSummarySectionProps) {
  const { high, medium, safe } = data.riskDistribution;
  const total = high + medium + safe;
  const riskPath = contractRiskProfilePath(contractId);

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-12">
      <div className="relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface p-6 shadow-soft md:col-span-8 sm:p-8">
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              description
            </span>
            <h2 className="font-display text-xl font-bold">Resumen ejecutivo</h2>
          </div>
          <p className="text-base leading-relaxed text-on-surface sm:text-lg">{data.summary}</p>
        </div>

        <div className="relative z-10 mt-8 grid grid-cols-3 gap-4 border-t border-outline-variant pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Cláusulas detectadas
            </p>
            <p className="mt-1 font-display text-2xl font-bold">{data.totalClauses}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Índice de atención
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-red-700">
              {data.riskScore}/100
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Alertas pendientes
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-primary">
              {data.revisionsSuggested}
            </p>
          </div>
        </div>

        <span className="pointer-events-none absolute -right-12 -top-12 text-primary/5">
          <span className="material-symbols-outlined text-[200px]">contract</span>
        </span>
      </div>

      <div className="flex flex-col justify-between rounded-2xl bg-primary p-6 text-on-primary shadow-card md:col-span-4 sm:p-8">
        <div>
          <h2 className="font-display text-xl font-bold">Distribución de riesgos</h2>
          <p className="mt-2 text-sm text-on-primary/80">
            Vista resumida. El detalle vive en el perfil de riesgo.
          </p>
          <div className="mt-6 space-y-5">
            {[
              {
                label: 'Riesgo alto',
                count: high,
                color: 'bg-red-400',
                pct: (high / total) * 100,
              },
              {
                label: 'Riesgo medio',
                count: medium,
                color: 'bg-amber-400',
                pct: (medium / total) * 100,
              },
              {
                label: 'Neutral / seguro',
                count: safe,
                color: 'bg-emerald-400',
                pct: (safe / total) * 100,
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-bold">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${Math.max(item.pct, 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Link
          to={riskPath}
          className="mt-8 w-full rounded-xl border border-white/25 bg-white/10 py-3 text-center text-sm font-semibold transition hover:bg-white/20"
        >
          Abrir perfil de riesgo
        </Link>
      </div>
    </div>
  );
}
