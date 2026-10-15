import type { AnalysisClauseItem } from '@/types/analysis-view.types';

const STYLE = {
  border: 'border-emerald-400',
  badge: 'bg-emerald-50 text-emerald-800',
  label: 'Estándar',
} as const;

export function AnalysisStandardClauseCard({ clause }: { clause: AnalysisClauseItem }) {
  return (
    <article
      className={`overflow-hidden rounded-2xl border-l-4 bg-surface shadow-soft transition hover:shadow-card ${STYLE.border}`}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4">
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STYLE.badge}`}>
            {STYLE.label}
          </span>
          <h3 className="mt-2 font-display text-lg font-bold">
            {clause.section}: {clause.title}
          </h3>
        </div>

        <p className="text-sm italic leading-relaxed text-on-surface-variant">
          &ldquo;{clause.excerpt}&rdquo;
        </p>

        {clause.lawRef && (
          <p className="mt-4 text-xs font-semibold text-primary">Ref: {clause.lawRef}</p>
        )}
      </div>
    </article>
  );
}
