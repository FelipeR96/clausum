import type { ComparisonChangeItem, ComparisonRiskLevel } from '@/types/comparison-view.types';

const LEVEL_STYLES: Record<ComparisonRiskLevel, string> = {
  critical: 'bg-red-50 text-red-800 border-red-200',
  moderate: 'bg-amber-50 text-amber-800 border-amber-200',
  low: 'bg-primary-container/40 text-on-primary-container border-primary/20',
};

const LEVEL_LABELS: Record<ComparisonRiskLevel, string> = {
  critical: 'Crítico',
  moderate: 'Moderado',
  low: 'Bajo',
};

type ComparisonUnifiedViewProps = {
  changes: ComparisonChangeItem[];
};

export function ComparisonUnifiedView({ changes }: ComparisonUnifiedViewProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-surface-container p-6 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-on-surface-variant">
          Lista consolidada de cambios detectados entre ambas versiones.
        </p>

        {changes.map((change) => (
          <article
            key={change.id}
            className="rounded-2xl border border-outline-variant/60 bg-surface p-5 shadow-soft"
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${LEVEL_STYLES[change.level]}`}
              >
                {LEVEL_LABELS[change.level]}
              </span>
              <span className="text-sm font-semibold text-on-surface">{change.section}</span>
            </div>
            <p className="font-medium text-on-surface">{change.summary}</p>

            {(change.before || change.after) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {change.before && (
                  <div className="rounded-xl bg-red-50/80 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase text-red-700">
                      Antes
                    </p>
                    <p className="text-sm text-red-900/90">{change.before}</p>
                  </div>
                )}
                {change.after && (
                  <div className="rounded-xl bg-emerald-50/80 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase text-emerald-700">
                      Después
                    </p>
                    <p className="text-sm text-emerald-900/90">{change.after}</p>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
