import { Link } from 'react-router-dom';
import type { RiskVectorItem } from '@/types/risk-alerts.types';

type RiskVectorCardProps = {
  risk: RiskVectorItem;
  contractId?: string;
};

export function RiskVectorCard({ risk, contractId }: RiskVectorCardProps) {
  const isHigh = risk.severity === 'high';
  const cardClass = isHigh ? 'risk-card-high risk-glow-red' : 'risk-card-medium risk-glow-amber';
  const badgeClass = isHigh
    ? 'bg-red-600 text-white'
    : 'bg-amber-500 text-white';
  const recBorder = isHigh ? 'border-red-100' : 'border-amber-100';

  return (
    <article
      className={`${cardClass} group rounded-2xl p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-card sm:p-8`}
    >
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="md:w-2/3">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${badgeClass}`}
            >
              {isHigh ? 'Riesgo alto' : 'Riesgo medio'}
            </span>
            <span className="text-sm font-medium text-on-surface-variant">
              {risk.section}
            </span>
          </div>

          <h3 className="mb-4 font-display text-xl font-bold text-on-surface">
            {risk.title}
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-on-surface-variant sm:text-base">
            {risk.description}
          </p>

          <div className="flex flex-wrap gap-4">
            {contractId && (
              <Link
                to={`/panel/contratos/${contractId}/resultado`}
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-base">visibility</span>
                Ver en documento
              </Link>
            )}
            {risk.showComparisonHistory && (
              <Link
                to="/comparar-contratos"
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-base">history</span>
                Historial de comparación
              </Link>
            )}
            {risk.lawRef && (
              <span className="flex items-center gap-1 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-base">gavel</span>
                {risk.lawRef}
              </span>
            )}
          </div>
        </div>

        <div
          className={`flex flex-col justify-between rounded-xl border bg-surface p-6 md:w-1/3 ${recBorder}`}
        >
          <div>
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Playbook de negociación
            </span>
            <p className="text-sm italic text-on-surface">
              &ldquo;{risk.recommendation}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
