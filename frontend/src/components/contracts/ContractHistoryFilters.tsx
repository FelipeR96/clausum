import type { ContractHistoryStatus } from '@/types/contract-history.types';
import {
  DATE_RANGE_OPTIONS,
  dateRangeLabel,
  type DateRangeFilter,
} from '@/utils/contract-history';

export type HistoryFilter = 'all' | ContractHistoryStatus;

type ContractHistoryFiltersProps = {
  query: string;
  filter: HistoryFilter;
  dateRange: DateRangeFilter;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: HistoryFilter) => void;
  onDateRangeChange: (value: DateRangeFilter) => void;
};

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'completed', label: 'Completos' },
  { id: 'scanning', label: 'Analizando' },
  { id: 'risk', label: 'Riesgo detectado' },
  { id: 'error', label: 'Con error' },
];

export function ContractHistoryFilters({
  query,
  filter,
  dateRange,
  onQueryChange,
  onFilterChange,
  onDateRangeChange,
}: ContractHistoryFiltersProps) {
  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="relative lg:col-span-5">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar por nombre de contrato o tipo..."
            className="w-full rounded-2xl border border-outline-variant bg-surface py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:col-span-4 lg:pb-0">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange(item.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-primary text-on-primary shadow-soft'
                    : 'border border-outline-variant bg-surface text-on-surface-variant hover:border-primary/40'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3">
          <label className="relative flex items-center gap-2 rounded-2xl border border-outline-variant bg-surface px-4 py-3.5 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined pointer-events-none text-base">
              calendar_today
            </span>
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value as DateRangeFilter)}
              className="flex-1 cursor-pointer appearance-none bg-transparent pr-6 text-on-surface outline-none"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {dateRangeLabel(option)}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-4 text-base">
              expand_more
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
