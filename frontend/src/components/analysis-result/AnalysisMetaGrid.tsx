import type { AnalysisResultData } from '@/types/analysis-view.types';

const META_ITEMS = [
  { key: 'effectiveDate', icon: 'calendar_today', label: 'Fecha de vigencia' },
  { key: 'contractValue', icon: 'monetization_on', label: 'Valor del contrato' },
  { key: 'jurisdiction', icon: 'location_on', label: 'Jurisdicción' },
  { key: 'renewal', icon: 'update', label: 'Renovación' },
] as const;

export function AnalysisMetaGrid({ data }: { data: AnalysisResultData }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {META_ITEMS.map((item) => (
        <div
          key={item.key}
          className="rounded-2xl border border-outline-variant/60 bg-surface-container p-5 shadow-soft"
        >
          <span className="material-symbols-outlined mb-3 text-primary">{item.icon}</span>
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {item.label}
          </p>
          <p className="mt-1 font-display text-lg font-bold text-on-surface">
            {data.metadata[item.key]}
          </p>
        </div>
      ))}
    </div>
  );
}
