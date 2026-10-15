import { Link } from 'react-router-dom';
import type { ComparisonRiskInsight, ComparisonRiskLevel } from '@/types/comparison-view.types';

const LEVEL_STYLES: Record<
  ComparisonRiskLevel,
  { badge: string; label: string }
> = {
  critical: {
    badge: 'bg-red-50 text-red-800',
    label: 'Riesgo crítico',
  },
  moderate: {
    badge: 'bg-amber-50 text-amber-800',
    label: 'Moderado',
  },
  low: {
    badge: 'bg-primary-container/50 text-on-primary-container',
    label: 'Bajo',
  },
};

type ComparisonAiSidebarProps = {
  insights: ComparisonRiskInsight[];
  contractId?: string;
};

export function ComparisonAiSidebar({ insights, contractId }: ComparisonAiSidebarProps) {
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-r border-outline-variant/60 bg-surface lg:flex">
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-on-surface">
          <span className="material-symbols-outlined text-primary">psychology</span>
          Resumen IA
        </h2>

        <div className="space-y-4">
          {insights.map((insight) => {
            const style = LEVEL_STYLES[insight.level];
            return (
              <div
                key={insight.id}
                className="group cursor-pointer rounded-xl border border-outline-variant/60 p-4 transition hover:border-primary/40 hover:shadow-soft"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}
                  >
                    {style.label}
                  </span>
                  {insight.sectionRef && (
                    <span className="material-symbols-outlined text-sm text-on-surface-variant transition group-hover:text-primary">
                      open_in_new
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-on-surface">{insight.title}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{insight.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-outline-variant/60 p-6">
        {contractId ? (
          <Link
            to={`/panel/contratos/${contractId}/resultado`}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-primary transition hover:bg-primary-container/30"
          >
            <span className="material-symbols-outlined">description</span>
            Ver análisis del contrato
          </Link>
        ) : (
          <button
            type="button"
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 py-2 text-sm font-semibold text-on-surface-variant opacity-60"
          >
            <span className="material-symbols-outlined">description</span>
            Historial de auditoría
          </button>
        )}
      </div>
    </aside>
  );
}
