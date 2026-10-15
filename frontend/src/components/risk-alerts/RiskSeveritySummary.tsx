import type { RiskAlertsData, RiskSortOption } from '@/types/risk-alerts.types';

type RiskSeveritySummaryProps = {
  data: RiskAlertsData;
  sort: RiskSortOption;
  onSortChange: (sort: RiskSortOption) => void;
};

const SORT_OPTIONS: { value: RiskSortOption; label: string }[] = [
  { value: 'severity', label: 'Más críticos primero' },
  { value: 'clause', label: 'Tipo de cláusula' },
  { value: 'compliance', label: 'Referencia legal' },
];

export function RiskSeveritySummary({
  data,
  sort,
  onSortChange,
}: RiskSeveritySummaryProps) {
  const items = [
    {
      label: 'Prioridad alta',
      count: data.severityCounts.high,
      dot: 'bg-red-600',
      bg: 'bg-red-50',
      text: 'text-red-700',
    },
    {
      label: 'Prioridad media',
      count: data.severityCounts.medium,
      dot: 'bg-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
    {
      label: 'Informativo',
      count: data.severityCounts.info,
      dot: 'bg-primary',
      bg: 'bg-primary-container/40',
      text: 'text-primary',
    },
  ];

  return (
    <div className="glass-panel flex h-full min-h-[320px] flex-col justify-between rounded-2xl p-6 sm:min-h-[360px] sm:p-8">
      <div>
        <h2 className="font-display text-xl font-bold text-on-surface">
          Distribución de severidad
        </h2>
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div
              key={item.label}
              className={`flex items-center justify-between rounded-xl p-3 ${item.bg}`}
            >
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${item.dot}`} />
                <span className="font-semibold text-on-surface">{item.label}</span>
              </div>
              <span className={`font-bold ${item.text}`}>
                {String(item.count).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-sm italic text-on-surface-variant">Ordenar por:</p>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as RiskSortOption)}
          className="mt-2 w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
