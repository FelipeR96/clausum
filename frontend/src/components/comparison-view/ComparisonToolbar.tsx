import { Link } from 'react-router-dom';
import type { ComparisonViewData, ComparisonViewMode } from '@/types/comparison-view.types';

type ComparisonToolbarProps = {
  data: ComparisonViewData;
  viewMode: ComparisonViewMode;
  onViewModeChange: (mode: ComparisonViewMode) => void;
};

export function ComparisonToolbar({
  data,
  viewMode,
  onViewModeChange,
}: ComparisonToolbarProps) {
  return (
    <section className="shrink-0 border-b border-outline-variant/60 bg-surface px-4 py-5 sm:px-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary-container/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
              Análisis activo
            </span>
            <span className="text-sm text-on-surface-variant">
              · Actualizado {data.updatedAgo}
            </span>
          </div>
          <h1 className="font-display text-lg font-bold text-on-surface sm:text-xl">
            {data.leftFileName}{' '}
            <span className="font-normal text-on-surface-variant">vs.</span>{' '}
            {data.rightFileName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-surface-container p-1">
            <button
              type="button"
              onClick={() => onViewModeChange('split')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                viewMode === 'split'
                  ? 'bg-surface text-on-surface shadow-soft'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-lg">vertical_split</span>
              Vista dividida
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('unified')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                viewMode === 'unified'
                  ? 'bg-surface text-on-surface shadow-soft'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-lg">layers</span>
              Unificada
            </button>
          </div>

          <div className="hidden h-8 w-px bg-outline-variant sm:block" />

          <div className="flex items-center gap-4 text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              {data.additionsCount} adiciones
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              {data.deletionsCount} eliminaciones
            </span>
          </div>

          <button
            type="button"
            title="Exportación disponible en plan Pro"
            className="hidden cursor-not-allowed items-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant opacity-70 sm:flex"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar informe
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              Pro
            </span>
          </button>

          <Link
            to="/panel/contratos"
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Historial
          </Link>
        </div>
      </div>
    </section>
  );
}
